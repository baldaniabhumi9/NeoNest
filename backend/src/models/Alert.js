const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    device: { type: mongoose.Schema.Types.ObjectId, ref: "Device", required: true, index: true },
    severity: { type: String, enum: ["info", "warning", "critical"], required: true },
    vital: { type: String, enum: ["heartRate", "spo2", "temperature", "motion", "skinContact", "battery", "system"], required: true },
    message: { type: String, required: true },
    value: { type: Number },
    threshold: { type: Number },
    acknowledged: { type: Boolean, default: false },
    acknowledgedAt: { type: Date },
    resolvedAt: { type: Date }
  },
  { timestamps: true }
);

alertSchema.index({ device: 1, createdAt: -1 });

module.exports = mongoose.model("Alert", alertSchema);
