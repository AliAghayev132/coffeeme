const express = require("express");
const PartnerShop = require("../schemas/PartnerShop");
const router = express.Router();
router.get("/", async (req, res) => {
  try {
    const partnerShops = await PartnerShop.find().populate("shop");
    return res.status(201).json({ message: "Successfull", partnerShops });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});
module.exports = router;
