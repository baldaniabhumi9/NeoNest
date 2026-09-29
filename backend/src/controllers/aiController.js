const AIPrediction = require("../models/AIPrediction");
const VitalReading = require("../models/VitalReading");
const { runAIAnalysis } = require("../services/aiEngine");

async function getLatestPrediction(req, res) {
  const prediction = await AIPrediction.findOne({ device: req.device._id }).sort({ generatedAt: -1 });
  res.json({ prediction });
}

async function getPredictionHistory(req, res) {
  const { limit = 200 } = req.query;
  const predictions = await AIPrediction.find({ device: req.device._id })
    .sort({ generatedAt: -1 })
    .limit(Math.min(Number(limit), 2000));
  res.json({ predictions: predictions.reverse() });
}

// On-demand recompute over an arbitrary window, e.g. for the AI Health page
async function recompute(req, res) {
  const { windowSize = 30 } = req.query;
  const readings = await VitalReading.find({ device: req.device._id })
    .sort({ timestamp: -1 })
    .limit(Math.min(Number(windowSize), 500));
  const analysis = runAIAnalysis(readings.reverse());
  res.json({ analysis });
}

module.exports = { getLatestPrediction, getPredictionHistory, recompute };
