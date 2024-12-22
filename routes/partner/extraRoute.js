const express = require("express");
const router = express.Router();
const validateAccessToken = require("../../middlewares/validateToken");
const extraController = require("../../controllers/partner/extraController");

router.get("/menu", validateAccessToken, extraController.getMenu);
router.get("/customers", validateAccessToken, extraController.getCustomers);
router.get("/closeUsers", validateAccessToken, extraController.getCloseUsers);
router.get("/recent-close-notifications", validateAccessToken, extraController.recentCloseNotifications);
router.get("/subscribers", validateAccessToken, extraController.getSubscribers);
router.get("/notifications", validateAccessToken, extraController.getNotifications);
router.post("/notifications", validateAccessToken, extraController.createNewNotification);
router.get("/history", validateAccessToken, extraController.getHistory);

module.exports = router;
