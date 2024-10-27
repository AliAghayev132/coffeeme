const express = require("express");
const router = express.Router();
const authRouter = require("./partner/authRoute");
const orderRouter = require("./partner/orderRoute");
const dataRouter = require("./partner/dataRoute");
const extraRouter = require("./partner/extraRoute");
const withdrawRouter = require("./partner/withdrawRoute");

router.use("/auth", authRouter);
router.use("/orders", orderRouter);
router.use("/data", dataRouter);
router.use("/extra", extraRouter);
router.use("/withdraw", withdrawRouter);

module.exports = router;
