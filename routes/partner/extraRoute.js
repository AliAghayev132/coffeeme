const express = require("express");
const router = express.Router();
const validateAccessToken = require("../../middlewares/validateToken");
const extraController = require("../../controllers/partner/extraController");

router.get("/menu", validateAccessToken, extraController.getMenu);
router.get("/subscribers", validateAccessToken, extraController.getSubscribers);
router.get(
  "/notifications",
  validateAccessToken,
  extraController.getNotifications
);
router.post(
  "/notifications",
  validateAccessToken,
  extraController.createNewNotification
);

module.exports = router;
