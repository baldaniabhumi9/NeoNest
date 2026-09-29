const User = require("../models/User");
const { signToken } = require("../utils/jwt");

async function signup(req, res) {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const user = await User.create({ name, email, password, phone });
  const token = signToken(user);
  res.status(201).json({ token, user: user.toSafeObject() });
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ error: "Incorrect email or password" });
  }

  const token = signToken(user);
  res.json({ token, user: user.toSafeObject() });
}

async function me(req, res) {
  res.json({ user: req.user.toSafeObject() });
}

async function updateMe(req, res) {
  const allowed = ["name", "phone", "notificationPrefs"];
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) req.user[field] = req.body[field];
  });
  await req.user.save();
  res.json({ user: req.user.toSafeObject() });
}

module.exports = { signup, login, me, updateMe };
