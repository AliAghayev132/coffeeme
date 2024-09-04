const express = require("express");
const router = express.Router();
const authRouter = require("./partner/authRoute");
const orderRouter = require("./partner/orderRoute");


router.use("/auth", authRouter);
router.use("/orders", orderRouter);

module.exports = router;
