const express = require("express");
const router = express.Router();
const Admin = require("../../schemas/Admin");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

router.post("/", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const passwordMatch = bcrypt.compare(password, admin.password);
    if (!passwordMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    const { email } = admin;
    const accessToken = jwt.sign(
      {
        email,
        _id: admin._id,
      },
      process.env.ACCESS_SECRET_KEY,
      {
        expiresIn: "10m",
      }
    );
    const refreshToken = jwt.sign(
      {
        email,
        _id: admin._id,
      },
      process.env.REFRESH_SECRET_KEY,
      {
        expiresIn: 24 * 60 * 60 * 15,
      }
    );
    return res.status(200).json({ refreshToken, accessToken });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});
router.post("/refresh-token", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const decoded = jwt.verify(token, process.env.REFRESH_SECRET_KEY);
    const { email, _id } = decoded;

    const newToken = jwt.sign({ email, _id }, process.env.ACCESS_SECRET_KEY, {
      expiresIn: "10m",
    });

    return res.status(200).json({ accessToken: newToken });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
