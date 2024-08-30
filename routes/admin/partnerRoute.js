const express = require("express");
const Partner = require("../../schemas/Partner");
const router = express.Router();
const validateAccessToken = require("../../middlewares/validateToken");
const bcrypt = require("bcrypt");

// Bütün partnyorları qaytarır
router.get("/", validateAccessToken, async (req, res) => {
  try {
    const partners = await Partner.find({}).select('-password').lean();
    return res.status(200).json({ success: true, partners });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
// Verilmiş aralığdaki partnyorları qaytarır
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
// Verilmiş idili edit edit
router.put("/:id", validateAccessToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password } = req.body;
    const partner = await Partner.findById(id);

    if(!username || !password){
      return res
      .status(400)
      .json({ success: false, message: "All Fields areq required" });
    }
    
    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    partner.username = username;
    partner.password = hashedPassword;
    await partner.save();
    return res
      .status(200)
      .json({ success: true, message: "Partner edited successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
