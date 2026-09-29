const express = require("express");
const { getLatestPrediction, getPredictionHistory, recompute } = require("../controllers/aiController");
const { requireUser, requireDeviceOwnership } = require("../middleware/auth");

const router = express.Router();
router.use(requireUser);

router.get("/:id/latest", requireDeviceOwnership, getLatestPrediction);
router.get("/:id/history", requireDeviceOwnership, getPredictionHistory);
router.get("/:id/recompute", requireDeviceOwnership, recompute);

module.exports = router;
