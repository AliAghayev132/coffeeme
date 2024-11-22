const express = require("express");
const router = express.Router();
const authRouter = require("./partner/authRoute");
const orderRouter = require("./partner/orderRoute");
const extraRouter = require("./partner/extraRoute");
const withdrawRouter = require("./partner/withdrawRoute");
const productRouter = require("./partner/productRoute");

router.use("/auth", authRouter);
router.use("/orders", orderRouter);
router.use("/extra", extraRouter);
router.use("/withdraw", withdrawRouter);
router.use("/products", productRouter);

module.exports = router;
