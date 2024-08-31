const express = require("express");
const router = express.Router();

// Router
const authRouter = require("./admin/authRoute");
const partnerRoute = require("./admin/partnerRoute");
const shopRoute = require("./admin/shopRoute");
const productRoute = require("./admin/productRoute");

router.use("/auth", authRouter);
router.use("/partners", partnerRoute);
router.use("/shops", shopRoute);
router.use("/products", productRoute);

module.exports = router;
