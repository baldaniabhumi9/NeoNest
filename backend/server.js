require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");

const connectDB = require("./src/config/db");
const initSockets = require("./src/sockets");
const { notFound, errorHandler } = require("./src/middleware/errorHandler");

const authRoutes = require("./src/routes/authRoutes");
const deviceRoutes = require("./src/routes/deviceRoutes");
const vitalsRoutes = require("./src/routes/vitalsRoutes");
const alertRoutes = require("./src/routes/alertRoutes");
const aiRoutes = require("./src/routes/aiRoutes");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }
});

app.set("io", io);

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Generous general limiter; the ESP32 ingest endpoint gets its own tighter one
const generalLimiter = rateLimit({ windowMs: 60 * 1000, max: 300 });
app.use("/api", generalLimiter);

const ingestLimiter = rateLimit({ windowMs: 60 * 1000, max: 120 }); // up to 2 readings/sec/device
app.use("/api/vitals/ingest", ingestLimiter);

app.get("/api/health", (req, res) => res.json({ status: "ok", service: "neovitals-backend" }));

app.use("/api/auth", authRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/vitals", vitalsRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/ai", aiRoutes);

app.use(notFound);
app.use(errorHandler);

initSockets(io);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`[server] NeoVitals backend listening on port ${PORT}`);
  });
});
