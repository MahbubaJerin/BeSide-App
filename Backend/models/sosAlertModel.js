const mongoose = require("mongoose");

const sosAlertSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    contactsSnapshot: [
      {
        name: String,
        phone: String,
        relation: String,
        email: String,
        isPrimary: Boolean,
      },
    ],
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      accuracy: Number,
    },
    note: { type: String, trim: true }, // optional short note from app
    delivered: { type: Boolean, default: false }, // future use (Twilio/email)
    meta: Object, // for provider responses later
  },
  { timestamps: true }
);

module.exports = mongoose.model("SosAlert", sosAlertSchema);
