const express = require("express");
const router = express.Router();

const validateAccessToken = require("../../middlewares/validateToken");
const extraController = require("../../controllers/admin/extraController");

router.get(
  "/notifications-partner",
  validateAccessToken,
  extraController.getPartnerNotifications
);

router.put(
  "/notifications-partner",
  validateAccessToken,
  extraController.updatePartnerNotification
);

module.exports = router;
