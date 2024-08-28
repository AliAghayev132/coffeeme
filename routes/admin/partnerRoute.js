const express = require("express");
const Partner = require("../../schemas/Partner");
const router = express.Router();
const validateAccessToken = require("../../middlewares/validateToken");

router.get("/", validateAccessToken, async (req, res) => {
  try {
    const partners = await Partner.find({}).lean();
    return res.status(200).json({ success: true, partners });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/next", validateAccessToken, async (req, res) => {
  try {
    const { offset, limit } = req.query;
    const partners = await Partner.find({}).skip(offset).limit(limit).lean();
    return res.status(200).json({ success: true, partners });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
