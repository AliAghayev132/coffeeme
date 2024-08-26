const express = require("express");
const Partner = require("../schemas/Partner");
const router = express.Router();
router.get("/", async (req, res) => {
  try {
    const partners = await Partner.find().populate("shop");
    return res.status(201).json({ message: "Successfull", partners });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});
router.put("/:id", async (req, res) => {
  try {
    const partner = await Partner.findById({id})
    return res.status(201).json({ message: "Successfull", partner });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});
module.exports = router;
