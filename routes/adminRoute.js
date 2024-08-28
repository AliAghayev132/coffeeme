const express = require("express");
const router = express.Router();
const authRouter = require("./admin/authRoute");
router.use("/auth", authRouter);

module.exports = router;
