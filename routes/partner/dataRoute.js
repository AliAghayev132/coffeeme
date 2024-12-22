const express = require("express");
const router = express.Router();
const validateAccessToken = require("../../middlewares/validateToken");
const dataController = require("../../controllers/partner/dataController");

router.get("/export-csv", validateAccessToken, dataController.exportDataCsv);

module.exports = router;
