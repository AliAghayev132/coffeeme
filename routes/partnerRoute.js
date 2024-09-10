const express = require("express");
const router = express.Router();
const authRouter = require("./partner/authRoute");
const orderRouter = require("./partner/orderRoute");
const dataRouter = require("./partner/dataRoute");


router.use("/auth", authRouter);
router.use("/orders", orderRouter);
router.use("/data", dataRouter);

module.exports = router;
