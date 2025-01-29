const express = require("express");
const router = express.Router();

// Router
const shopRoute = require("./admin/shopRoute");
const userRoute = require("./admin/userRoute");
const authRouter = require("./admin/authRoute");
const extraRoute = require("./admin/extraRoute");
const slideRoute = require("./admin/slideRoute");
const partnerRoute = require("./admin/partnerRoute");
const productRoute = require("./admin/productRoute");
const withdrawRoute = require("./admin/withdrawRoute");


router.use("/auth", authRouter);
router.use("/shops", shopRoute);
router.use("/users", userRoute);
router.use("/extra", extraRoute);
router.use("/slide", slideRoute);
router.use("/partners", partnerRoute);
router.use("/products", productRoute);
router.use("/withdraws", withdrawRoute);

module.exports = router;
