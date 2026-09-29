const { verifyToken } = require("../utils/jwt");
const Device = require("../models/Device");

/**
 * Dashboard clients connect and join a room per device ("device:<deviceId>").
 * The vitals ingest controller emits into that room whenever new data
 * arrives from the ESP32, giving sub-second live updates on the frontend.
 */
function initSockets(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Missing auth token"));
      const payload = verifyToken(token);
      socket.userId = payload.sub;
      next();
    } catch (err) {
      next(new Error("Invalid auth token"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("subscribe:device", async (deviceId) => {
      const device = await Device.findOne({ deviceId });
      if (!device) return socket.emit("error", { message: "Unknown device" });
      if (device.owner.toString() !== socket.userId) {
        return socket.emit("error", { message: "Not authorized for this device" });
      }
      socket.join(`device:${deviceId}`);
      socket.emit("subscribed", { deviceId });
    });

    socket.on("unsubscribe:device", (deviceId) => {
      socket.leave(`device:${deviceId}`);
    });
  });
}

module.exports = initSockets;
