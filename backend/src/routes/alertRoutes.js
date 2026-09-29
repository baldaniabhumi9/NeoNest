const express = require("express");
const { listAlerts, acknowledgeAlert, resolveAlert } = require("../controllers/alertController");
const { requireUser, requireDeviceOwnership } = require("../middleware/auth");

const router = express.Router();
router.use(requireUser);

router.get("/:id", requireDeviceOwnership, listAlerts);
router.patch("/:id/:alertId/acknowledge", requireDeviceOwnership, acknowledgeAlert);
router.patch("/:id/:alertId/resolve", requireDeviceOwnership, resolveAlert);

module.exports = router;
