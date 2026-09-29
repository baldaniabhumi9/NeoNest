const express = require("express");
const { signup, login, me, updateMe } = require("../controllers/authController");
const { requireUser } = require("../middleware/auth");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", requireUser, me);
router.patch("/me", requireUser, updateMe);

module.exports = router;
