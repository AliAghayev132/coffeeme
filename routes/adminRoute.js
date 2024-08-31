const express = require("express");
const router = express.Router();

// Router
const authRouter = require("./admin/authRoute");
const partnerRoute = require("./admin/partnerRoute");
const shopRoute = require("./admin/shopRoute");

router.use("/auth", authRouter);
router.use("/partners", partnerRoute);
router.use("/shops", shopRoute);

module.exports = router;
