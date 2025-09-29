const User = require("../models/userModel");
const SosAlert = require("../models/sosAlertModel");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

// POST /api/v1/sos/send
// body: { location: { latitude, longitude, accuracy? }, note? }
exports.sendSOS = catchAsync(async (req, res, next) => {
  const { location, note } = req.body;

  if (!location || typeof location.latitude !== "number" || typeof location.longitude !== "number") {
    return next(new AppError("Valid location {latitude, longitude} is required", 400));
  }

  // Get user's contacts
  const user = await User.findById(req.user._id).select("firstName lastName mobileNo emergencyContacts");
  if (!user) return next(new AppError("User not found", 404));

  const contacts = user.emergencyContacts || [];
  if (contacts.length === 0) {
    // Do not fail silently; tell client to add contacts
    return next(new AppError("No emergency contacts found for this user", 400));
  }

  // Store alert (audit/log)
  const alert = await SosAlert.create({
    user: req.user._id,
    contactsSnapshot: contacts.map(c => ({
      name: c.name, phone: c.phone, relation: c.relation, email: c.email, isPrimary: !!c.isPrimary
    })),
    location: {
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
      accuracy: location.accuracy ? Number(location.accuracy) : undefined,
    },
    note: note?.toString()?.slice(0, 200),
  });

  // MVP: no external sends yet — just log for server ops
  console.log("🚨 SOS RECEIVED:", {
    user: `${user.firstName} ${user.lastName}`,
    phone: user.mobileNo,
    contacts: contacts.map(c => `${c.name} (${c.phone})`),
    location,
    alertId: alert._id.toString(),
  });

  // Future: integrate Twilio/email/push here, then set alert.delivered=true + meta
  res.status(200).json({
    status: "success",
    message: "SOS received. Contacts recorded. (Delivery provider not yet integrated)",
    data: { alertId: alert._id },
  });
});
