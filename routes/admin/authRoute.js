const express = require("express");
const router = express.Router();
const Admin = require("../../schemas/Admin");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

router.post("/", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Ensure all fields are present
    if (!username || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Find the admin user
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check password
    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate tokens
    const { email } = admin;
    const accessToken = jwt.sign(
      { email, _id: admin._id },
      process.env.ACCESS_SECRET_KEY,
      { expiresIn: "10m" }
    );
    const refreshToken = jwt.sign(
      { email, _id: admin._id },
      process.env.REFRESH_SECRET_KEY,
      { expiresIn: 24 * 60 * 60 * 15 }  // 15 days
    );

    // Respond with tokens
    return res.status(200).json({ refreshToken, accessToken });
    
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});
router.post("/refresh-token", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.REFRESH_SECRET_KEY);
    } catch (error) {
      // Token geçersiz veya süresi dolmuşsa
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Unauthorized: Token expired" });
      } else if (error.name === "JsonWebTokenError") {
        return res.status(401).json({ error: "Unauthorized: Invalid token" });
      } else {
        return res
          .status(401)
          .json({ error: "Unauthorized: Token verification failed" });
      }
    }

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
