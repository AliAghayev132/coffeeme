const express = require("express");
const router = express.Router();
const validateAccessToken = require("../../middlewares/validateToken");
const orderController = require("../../controllers/admin/orderController");

router.get("/", validateAccessToken, orderController.getOrders);
router.put("/:id", validateAccessToken, orderController.updateOrderStatus);

module.exports = router;
