const Alert = require("../models/Alert");

async function listAlerts(req, res) {
  const { status = "all", limit = 100 } = req.query;
  const query = { device: req.device._id };
  if (status === "unacknowledged") query.acknowledged = false;
  if (status === "acknowledged") query.acknowledged = true;

  const alerts = await Alert.find(query).sort({ createdAt: -1 }).limit(Math.min(Number(limit), 1000));
  res.json({ alerts });
}

async function acknowledgeAlert(req, res) {
  const alert = await Alert.findOne({ _id: req.params.alertId, device: req.device._id });
  if (!alert) return res.status(404).json({ error: "Alert not found" });
  alert.acknowledged = true;
  alert.acknowledgedAt = new Date();
  await alert.save();
  res.json({ alert });
}

async function resolveAlert(req, res) {
  const alert = await Alert.findOne({ _id: req.params.alertId, device: req.device._id });
  if (!alert) return res.status(404).json({ error: "Alert not found" });
  alert.resolvedAt = new Date();
  await alert.save();
  res.json({ alert });
}

module.exports = { listAlerts, acknowledgeAlert, resolveAlert };
