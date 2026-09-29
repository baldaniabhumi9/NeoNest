const { verifyToken } = require("../utils/jwt");
const User = require("../models/User");
const Device = require("../models/Device");

// Protects routes that require a logged-in user (parent/clinician/admin)
async function requireUser(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing authentication token" });

    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: "User no longer exists" });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Confirms the logged-in user owns the :deviceId in the route/body
async function requireDeviceOwnership(req, res, next) {
  try {
    const deviceMongoId = req.params.id || req.body.device;
    const device = await Device.findById(deviceMongoId);
    if (!device) return res.status(404).json({ error: "Device not found" });
    if (device.owner.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ error: "You do not have access to this device" });
    }
    req.device = device;
    next();
  } catch (err) {
    return res.status(400).json({ error: "Invalid device reference" });
  }
}

// Authenticates an ESP32 firmware request using deviceId + deviceKey (not a user JWT)
async function requireDeviceAuth(req, res, next) {
  try {
    const deviceId = req.headers["x-device-id"];
    const deviceKey = req.headers["x-device-key"];
    if (!deviceId || !deviceKey) {
      return res.status(401).json({ error: "Missing device credentials" });
    }
    const device = await Device.findOne({ deviceId }).select("+deviceKey");
    if (!device || device.deviceKey !== deviceKey) {
      return res.status(401).json({ error: "Invalid device credentials" });
    }
    req.device = device;
    next();
  } catch (err) {
    return res.status(500).json({ error: "Device authentication failed" });
  }
}

module.exports = { requireUser, requireDeviceOwnership, requireDeviceAuth };
