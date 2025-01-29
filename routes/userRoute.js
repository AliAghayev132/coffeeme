// Express
const express = require("express");
const router = express.Router();

// Router
const shopRouter = require("./user/shopRoute");
const authRouter = require("./user/authRoute");
const slideRouter = require("./user/slideRoute");
const orderRouter = require("./user/orderRoute");
const extraRouter = require("./user/extraRoute");

// Routes
router.use("/auth", authRouter);
router.use("/shops", shopRouter);
router.use("/extra", extraRouter);
router.use("/slide", slideRouter);
router.use("/orders", orderRouter);

module.exports = router;
