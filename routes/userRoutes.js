// server/routes/userRoutes.js
const express = require("express");
const User = require("../models/User");
const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = new User({ username, password });
    await user.save();
    res.send({ message: "User registered successfully" });
  } catch (error) {
    res.status(400).send({ message: "Error registering user", error });
  }
});

module.exports = router;
