const express = require("express");
const router = express.Router();
const validateAccessToken = require("../../middlewares/validateToken");
const historyController = require("../../controllers/partner/historyController");

router.get("/export-csv", validateAccessToken, historyController.exportHistoryCsv);

module.exports = router;
