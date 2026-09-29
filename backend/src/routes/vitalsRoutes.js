const express = require("express");
const { ingestVitals, getLatest, getHistory } = require("../controllers/vitalsController");
const { requireUser, requireDeviceOwnership, requireDeviceAuth } = require("../middleware/auth");

const router = express.Router();

// Called by the ESP32 firmware, authenticated with device credentials
router.post("/ingest", requireDeviceAuth, ingestVitals);

// Called by the dashboard, authenticated as a logged-in user who owns the device
router.get("/:id/latest", requireUser, requireDeviceOwnership, getLatest);
router.get("/:id/history", requireUser, requireDeviceOwnership, getHistory);

module.exports = router;
