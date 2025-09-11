const User = require("../models/userModel");
const SosAlert = require("../models/sosAlertModel");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

// Twilio setup (reads from .env)
const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
const twilioFrom = process.env.TWILIO_FROM; // e.g. "+61XXXXXXXXX"
const twilioClient = (twilioSid && twilioAuth) ? require("twilio")(twilioSid, twilioAuth) : null;

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

  // Compose SMS message
  const mapsUrl = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
  const message = [
    "🚨 EMERGENCY: I need help.",
    `Name: ${[(user.firstName || ""), (user.lastName || "")].join(" ").trim()}`,
    user.mobileNo ? `Phone: ${user.mobileNo}` : null,
    `Location: ${mapsUrl}`,
    note ? `Note: ${note}` : null
  ].filter(Boolean).join("\n");

  // Normalize AU numbers to E.164 (very basic; adjust as needed)
  const normalize = (p) => {
    if (!p) return null;
    const d = p.replace(/[^\d+]/g, "");
    if (d.startsWith("+")) return d;
    if (d.startsWith("0")) return `+61${d.slice(1)}`;
    return `+61${d}`;
  };

  // Send SMS via Twilio (if configured)
  let results = [];
  if (twilioClient && twilioFrom) {
    const phones = contacts.map(c => normalize(c.phone)).filter(Boolean);
    results = await Promise.allSettled(
      phones.map(to => twilioClient.messages.create({ from: twilioFrom, to, body: message }))
    );
  } else {
    console.log("⚠️ Twilio not configured; skipping SMS send.");
  }

  // Record provider outcome
  const delivered = results.length > 0 && results.every(r => r.status === "fulfilled");
  alert.delivered = delivered;
  alert.meta = { sms: results.map(r => (r.status === "fulfilled" ? { sid: r.value.sid } : { error: r.reason?.message })) };
  await alert.save();

  console.log("🚨 SOS RECEIVED:", {
    user: `${user.firstName} ${user.lastName}`,
    phone: user.mobileNo,
    contacts: contacts.map(c => `${c.name} (${c.phone})`),
    location,
    alertId: alert._id.toString(),
    sentSms: results.length,
  });

  // Respond to app
  res.status(200).json({
    status: "success",
    message: delivered ? "SOS sent to contacts and logged." : "SOS logged. (SMS not fully sent.)",
    data: { alertId: alert._id, delivered, mapsUrl }
  });
});
