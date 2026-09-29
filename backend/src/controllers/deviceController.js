const Device = require("../models/Device");

async function listDevices(req, res) {
  const devices = await Device.find({ owner: req.user._id }).sort({ createdAt: -1 });
  res.json({ devices });
}

async function getDevice(req, res) {
  res.json({ device: req.device });
}

async function registerDevice(req, res) {
  const { deviceId, name, baby } = req.body;
  if (!deviceId) return res.status(400).json({ error: "deviceId (the shoe's hardware ID) is required" });

  const exists = await Device.findOne({ deviceId });
  if (exists) return res.status(409).json({ error: "This device is already registered" });

  const deviceKey = Device.generateDeviceKey();
  const device = await Device.create({
    owner: req.user._id,
    deviceId,
    deviceKey,
    name: name || "NeoVitals Shoe",
    baby: baby || {},
    status: "pending_setup"
  });

  // deviceKey is only ever shown once, at registration time — flash it to
  // the ESP32 firmware's config (WiFiManager portal, etc.) and never again.
  res.status(201).json({
    device: { ...device.toObject(), deviceKey: undefined },
    deviceKey
  });
}

async function updateDevice(req, res) {
  const allowed = ["name", "baby", "thresholds"];
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) req.device[field] = req.body[field];
  });
  await req.device.save();
  res.json({ device: req.device });
}

async function deleteDevice(req, res) {
  await req.device.deleteOne();
  res.json({ message: "Device removed" });
}

async function regenerateKey(req, res) {
  req.device.deviceKey = Device.generateDeviceKey();
  await req.device.save();
  res.json({ deviceKey: req.device.deviceKey });
}

module.exports = { listDevices, getDevice, registerDevice, updateDevice, deleteDevice, regenerateKey };
