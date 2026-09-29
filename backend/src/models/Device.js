const mongoose = require("mongoose");
const crypto = require("crypto");

const deviceSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    deviceId: { type: String, required: true, unique: true, trim: true }, // e.g. printed serial / chip id
    deviceKey: { type: String, required: true, select: false }, // secret the ESP32 firmware presents
    name: { type: String, default: "NeoVitals Shoe" },
    baby: {
      name: { type: String, default: "Baby" },
      dob: { type: Date },
      sex: { type: String, enum: ["unspecified", "male", "female"], default: "unspecified" },
      weightGrams: { type: Number },
      gestationalAgeWeeks: { type: Number }
    },
    status: { type: String, enum: ["online", "offline", "pending_setup"], default: "pending_setup" },
    lastSeenAt: { type: Date },
    firmwareVersion: { type: String, default: "1.0.0" },
    battery: { type: Number, default: null }, // percent
    thresholds: {
      heartRateLow: { type: Number, default: 100 },
      heartRateHigh: { type: Number, default: 180 },
      spo2Low: { type: Number, default: 90 },
      temperatureLow: { type: Number, default: 36.0 },
      temperatureHigh: { type: Number, default: 37.8 }
    }
  },
  { timestamps: true }
);

deviceSchema.statics.generateDeviceKey = function generateDeviceKey() {
  return crypto.randomBytes(24).toString("hex");
};

module.exports = mongoose.model("Device", deviceSchema);
