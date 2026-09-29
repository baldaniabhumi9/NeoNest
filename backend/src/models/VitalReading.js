const mongoose = require("mongoose");

const vitalReadingSchema = new mongoose.Schema(
  {
    device: { type: mongoose.Schema.Types.ObjectId, ref: "Device", required: true, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    heartRate: { type: Number }, // bpm
    spo2: { type: Number }, // %
    temperature: { type: Number }, // celsius
    motion: { type: Number }, // 0-100 activity score derived from accelerometer
    skinContact: { type: Boolean, default: true },
    battery: { type: Number } // percent
  },
  { timestamps: false }
);

// Fast range queries per device
vitalReadingSchema.index({ device: 1, timestamp: -1 });

module.exports = mongoose.model("VitalReading", vitalReadingSchema);
