const express = require("express");
const Partner = require("../../schemas/Partner");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const validateAccessToken = require("../../middlewares/validateToken");

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const partner = await Partner.findOne({ username });
    if (!partner) return res.status(404).json({ message: "Partner not found" });

    const passwordMatch = await bcrypt.compare(password, partner.password);
    if (!passwordMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    const accessToken = jwt.sign(
      {
        username,
      },
      process.env.ACCESS_SECRET_KEY,
      {
        expiresIn: "10m",
      }
    );

    const refreshToken = jwt.sign(
      {
        username,
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
    const { username } = decoded;
    const partner = await Partner.findOne({ username });

    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }

    const newToken = jwt.sign(
      { username: partner.username },
      process.env.ACCESS_SECRET_KEY,
      {
        expiresIn: "10m",
      }
    );
    return res.status(200).json({ accessToken: newToken });
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Unauthorized" });
  }
});

router.get("/", validateAccessToken, async (req, res) => {
  try {
    const { username } = req.user;
    const partner = await Partner.findOne({ username }).populate("shop");

    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }
    return res.status(200).json({ success: true, partner });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});
module.exports = router;
