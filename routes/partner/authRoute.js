const express = require("express");
const Partner = require("../../schemas/Partner");
const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const partner = await Partner.findOne({ username });
    if (!partner) return res.status(404).json({ message: "Partner not found" });

    const passwordMatch = bcrypt.compare(password, partner.password);
    if (!passwordMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const accessToken = jwt.sign(
      {
        email,
        _id: partner._id,
      },
      process.env.ACCESS_SECRET_KEY,
      {
        expiresIn: "10m",
      }
    );

    const refreshToken = jwt.sign(
      {
        email,
        _id: partner._id,
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
module.exports = router;
