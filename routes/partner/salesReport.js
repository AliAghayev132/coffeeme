const express = require("express");
const router = express.Router();
const validateAccessToken = require("../../middlewares/validateToken");
const salesReportController = require("../../controllers/partner/salesReportController");

// Sales Report
router.get("/full-report", validateAccessToken, salesReportController.getFullReport);
router.get("/report-between-days", validateAccessToken, salesReportController.getReportBetweenDays);

module.exports = router;
