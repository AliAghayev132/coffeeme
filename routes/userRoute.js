const express = require("express");
const router = express.Router();
const authRouter = require("./user/authRoute");
const orderRouter = require("./user/orderRoute");
const shopRouter = require("./user/shopRoute");
router.use("/auth", authRouter);
router.use("/orders", orderRouter);
router.use("/shops", shopRouter);
module.exports = router;
