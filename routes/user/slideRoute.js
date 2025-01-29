const express = require("express");
const router = express.Router();
const slideController = require("../../controllers/user/slideController");
const validateAccessToken = require("../../middlewares/validateToken");

router.get("/", validateAccessToken, slideController.getAllSlides);

module.exports = router;