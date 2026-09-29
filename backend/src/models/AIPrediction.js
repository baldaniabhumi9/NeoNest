const mongoose = require("mongoose");

const aiPredictionSchema = new mongoose.Schema(
  {
    device: { type: mongoose.Schema.Types.ObjectId, ref: "Device", required: true, index: true },
    generatedAt: { type: Date, default: Date.now, index: true },
    riskScore: { type: Number, min: 0, max: 100 }, // composite 0 (calm) - 100 (critical)
    riskLevel: { type: String, enum: ["calm", "attention", "alert", "critical"] },
    anomalies: [
      {
        vital: String,
        description: String,
        zScore: Number
      }
    ],
    trends: {
      heartRate: { type: String, enum: ["rising", "falling", "stable"] },
      spo2: { type: String, enum: ["rising", "falling", "stable"] },
      temperature: { type: String, enum: ["rising", "falling", "stable"] }
    },
    sleepState: { type: String, enum: ["awake", "active_sleep", "quiet_sleep", "unknown"] },
    notes: { type: String }
  },
  { timestamps: false }
);

aiPredictionSchema.index({ device: 1, generatedAt: -1 });

module.exports = mongoose.model("AIPrediction", aiPredictionSchema);
