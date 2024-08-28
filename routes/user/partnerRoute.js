// const express = require("express");
// const PartnerShop = require("../schemas/PartnerShop");
// const router = express.Router();
// router.get("/", async (req, res) => {
//   try {
//     const PartnerShops = await PartnerShop.find().populate("shop");
//     return res.status(201).json({ message: "Successfull", PartnerShops });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// });
// router.put("/:id", async (req, res) => {
//   try {
//     const PartnerShop = await PartnerShop.findById({id})
//     return res.status(201).json({ message: "Successfull", PartnerShop });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// });
// module.exports = router;
