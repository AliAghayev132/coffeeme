const express = require("express");
const router = express.Router();
const validateAccessToken = require("../../middlewares/validateToken");
const extraController = require("../../controllers/partner/extraController");
const Partner = require("../../schemas/Partner");

router.get("/menu", validateAccessToken, extraController.getMenu);
router.get("/customers", validateAccessToken, extraController.getCustomers);
router.get("/closeUsers", validateAccessToken, extraController.getCloseUsers);
router.get(
  "/recent-close-notifications",
  validateAccessToken,
  async (req, res) => {
    try {
      const { username } = req.user;

      const partner = await Partner.findOne({ username }).populate({
        path: "recentCloseNotifications",
        populate: {
          path: "user", // User bilgilerini populate et
          select: "firstname secondname birthDate gender image", // Gerekli alanları seç
        },
      });

      if (!partner)
        return res
          .status(404)
          .json({ success: false, message: "Partner not found" });

      console.log(partner.recentCloseNotifications);

      return res.status(200).json({
        message: "All close users got",
        success: true,
        notifications: partner.recentCloseNotifications,
      });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);
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
