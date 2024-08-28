const express = require("express");
const router = express.Router();

// Router
const authRouter = require("./admin/authRoute");
const partnerRoute = require("./admin/partnerRoute");

router.use("/auth", authRouter);
router.use("/partners", partnerRoute);

module.exports = router;
