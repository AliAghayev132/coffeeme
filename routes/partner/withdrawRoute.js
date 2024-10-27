const express = require("express");
const router = express.Router();
const validateAccessToken = require("../../middlewares/validateToken");
const withdrawController = require("../../controllers/partner/withdrawController");

router.get("/", validateAccessToken, withdrawController.getWithdraws);
router.post("/new", validateAccessToken, withdrawController.withdrawBalance);

module.exports = router;
