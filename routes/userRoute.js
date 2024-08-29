const express = require("express");
const router = express.Router();
const authRouter = require("./user/authRoute");
const orderRouter = require("./user/orderRoute");
router.use("/auth", authRouter);
router.use("/orders", orderRouter);
module.exports = router;
