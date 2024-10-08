const express = require("express");
const router = express.Router();
const authRouter = require("./user/authRoute");
const orderRouter = require("./user/orderRoute");
const shopRouter = require("./user/shopRoute");
const extraRouter = require("./user/extraRoute");
router.use("/auth", authRouter);
router.use("/orders", orderRouter);
router.use("/shops", shopRouter);
router.use("/extra", extraRouter);
module.exports = router;
