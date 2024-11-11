const express = require("express");
const validateAccessToken = require("../../middlewares/validateToken");
const router = express.Router();
const productController = require("../../controllers/partner/productController");
router.put("/:id", validateAccessToken, productController.updateStockStatus);
router.get("/", validateAccessToken, productController.getAllProducts);
module.exports = router;
