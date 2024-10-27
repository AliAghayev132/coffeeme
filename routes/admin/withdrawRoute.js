const express = require("express");
const router = express.Router();
const withdrawPartnerController = require("../../controllers/admin/withdrawPartnerController");
const validateAccessToken = require("../../middlewares/validateToken");

router.get("/", validateAccessToken, withdrawPartnerController.getWithdraws);
router.put(
  "/update",
  validateAccessToken,
  withdrawPartnerController.updateWithdrawStatus
);

module.exports = router;
z