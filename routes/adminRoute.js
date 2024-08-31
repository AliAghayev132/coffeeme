const express = require("express");
const router = express.Router();

// Router
const authRouter = require("./admin/authRoute");
const partnerRoute = require("./admin/partnerRoute");
const shopRoute = require("./admin/shopRoute");
const productRoute = require("./admin/productRoute");
const userRoute = require("./admin/userRoute");

router.use("/auth", authRouter);
router.use("/partners", partnerRoute);
router.use("/shops", shopRoute);
router.use("/products", productRoute);
router.use("/users", userRoute);

module.exports = router;
