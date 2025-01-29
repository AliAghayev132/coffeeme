const express = require("express");
const router = express.Router();
const slideController = require("../../controllers/admin/slideController");
const validateAccessToken = require("../../middlewares/validateToken");

router.get("/", validateAccessToken, slideController.getAllSlides);
router.post("/", validateAccessToken, slideController.addNewSlide);
router.delete("/", validateAccessToken, slideController.deleteSlide);

module.exports = router;