const VitalReading = require("../models/VitalReading");
const Alert = require("../models/Alert");
const Device = require("../models/Device");
const { runAIAnalysis } = require("../services/aiEngine");
const AIPrediction = require("../models/AIPrediction");

const HISTORY_WINDOW_FOR_AI = 30; // readings used for rolling analysis

function checkThresholdAlerts(device, reading) {
  const alerts = [];
  const t = device.thresholds;

  if (reading.heartRate != null) {
    if (reading.heartRate < t.heartRateLow) {
      alerts.push({ severity: "warning", vital: "heartRate", message: `Heart rate low: ${reading.heartRate} bpm`, value: reading.heartRate, threshold: t.heartRateLow });
    } else if (reading.heartRate > t.heartRateHigh) {
      alerts.push({ severity: "warning", vital: "heartRate", message: `Heart rate high: ${reading.heartRate} bpm`, value: reading.heartRate, threshold: t.heartRateHigh });
    }
  }
  if (reading.spo2 != null && reading.spo2 < t.spo2Low) {
    const severity = reading.spo2 < t.spo2Low - 5 ? "critical" : "warning";
    alerts.push({ severity, vital: "spo2", message: `Oxygen saturation low: ${reading.spo2}%`, value: reading.spo2, threshold: t.spo2Low });
  }
  if (reading.temperature != null) {
    if (reading.temperature < t.temperatureLow) {
      alerts.push({ severity: "warning", vital: "temperature", message: `Temperature low: ${reading.temperature}\u00b0C`, value: reading.temperature, threshold: t.temperatureLow });
    } else if (reading.temperature > t.temperatureHigh) {
      alerts.push({ severity: "warning", vital: "temperature", message: `Temperature high: ${reading.temperature}\u00b0C`, value: reading.temperature, threshold: t.temperatureHigh });
    }
  }
  if (reading.skinContact === false) {
    alerts.push({ severity: "info", vital: "skinContact", message: "Shoe may not be worn correctly \u2014 poor skin contact detected" });
  }
  if (reading.battery != null && reading.battery <= 15) {
    alerts.push({ severity: reading.battery <= 5 ? "critical" : "warning", vital: "battery", message: `Device battery low: ${reading.battery}%`, value: reading.battery, threshold: 15 });
  }
  return alerts;
}

/**
 * POST /api/vitals/ingest — called directly by the ESP32 firmware.
 * Authenticated via requireDeviceAuth (x-device-id / x-device-key headers).
 */
async function ingestVitals(req, res) {
  const device = req.device;
  const { heartRate, spo2, temperature, motion, skinContact, battery } = req.body;

  const reading = await VitalReading.create({
    device: device._id,
    heartRate,
    spo2,
    temperature,
    motion,
    skinContact,
    battery
  });

  device.status = "online";
  device.lastSeenAt = new Date();
  if (battery != null) device.battery = battery;
  await device.save();

  const newAlerts = checkThresholdAlerts(device, reading);
  const savedAlerts = newAlerts.length ? await Alert.insertMany(newAlerts.map((a) => ({ ...a, device: device._id }))) : [];

  // Run the AI engine over the recent rolling window
  const recent = await VitalReading.find({ device: device._id }).sort({ timestamp: -1 }).limit(HISTORY_WINDOW_FOR_AI);
  const analysis = runAIAnalysis(recent.reverse());
  const prediction = await AIPrediction.create({ device: device._id, ...analysis });

  // Push everything live to any connected dashboards for this device
  const io = req.app.get("io");
  if (io) {
    io.to(`device:${device.deviceId}`).emit("vital:new", reading);
    io.to(`device:${device.deviceId}`).emit("ai:update", prediction);
    savedAlerts.forEach((a) => io.to(`device:${device.deviceId}`).emit("alert:new", a));
  }

  res.status(201).json({ reading, alerts: savedAlerts, analysis });
}

async function getLatest(req, res) {
  const reading = await VitalReading.findOne({ device: req.device._id }).sort({ timestamp: -1 });
  res.json({ reading });
}

async function getHistory(req, res) {
  const { from, to, limit = 500 } = req.query;
  const query = { device: req.device._id };
  if (from || to) {
    query.timestamp = {};
    if (from) query.timestamp.$gte = new Date(from);
    if (to) query.timestamp.$lte = new Date(to);
  }
  const readings = await VitalReading.find(query).sort({ timestamp: -1 }).limit(Math.min(Number(limit), 5000));
  res.json({ readings: readings.reverse() });
}

module.exports = { ingestVitals, getLatest, getHistory };
