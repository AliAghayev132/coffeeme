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

router.get("/fingertips", validateAccessToken, extraController.getFingerTips);
router.post(
  "/fingertips-shop",
  validateAccessToken,
  extraController.getFingerTips
);
router.delete(
  "/fingertips-shop",
  validateAccessToken,
  extraController.getFingerTips
);
router.post(
  "/fingertips-product",
  validateAccessToken,
  extraController.getFingerTips
);
router.delete(
  "/fingertips-product",
  validateAccessToken,
  extraController.getFingerTips
);

module.exports = router;
