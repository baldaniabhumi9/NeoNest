const express = require("express");
const {
  listDevices,
  getDevice,
  registerDevice,
  updateDevice,
  deleteDevice,
  regenerateKey
} = require("../controllers/deviceController");
const { requireUser, requireDeviceOwnership } = require("../middleware/auth");

const router = express.Router();

router.use(requireUser);

router.get("/", listDevices);
router.post("/", registerDevice);
router.get("/:id", requireDeviceOwnership, getDevice);
router.patch("/:id", requireDeviceOwnership, updateDevice);
router.delete("/:id", requireDeviceOwnership, deleteDevice);
router.post("/:id/regenerate-key", requireDeviceOwnership, regenerateKey);

module.exports = router;
