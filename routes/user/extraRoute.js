const express = require("express");
const router = express.Router();
// Utils
const validateAccessToken = require("../../middlewares/validateToken");
// Models
const User = require("../../schemas/User");
const Order = require("../../schemas/Order");
const Shop = require("../../schemas/Shop");
const Product = require("../../schemas/Product");
const roundToTwoDecimals = require("../../utils/roundToTwoDecimals");

const extraController = require("../../controllers/user/extraController");

// Route to get all historical (completed/canceled) orders for the authenticated user
router.get("/history", validateAccessToken, async (req, res) => {
  try {
    const { email } = req.user;

    // Find the user by email and populate the 'history' field with related Order details
    const user = await User.findOne({ email }).populate({
      path: "history",
      populate: [
        {
          path: "items.product", // Populate product details in each order
          select: "name price photo shop sizes", // Select specific fields from the Product schema
        },
        {
          path: "shop", // Populate shop details for each order
          select: "name logo address shortAddress", // Select specific fields from the Shop schema
        },
      ],
      select:
        "status totalPrice totalDiscountedPrice items shop statusHistory rating category", // Fields to retrieve from the Order schema
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Return the user's historical orders with product and shop details populated
    return res.status(200).json({
      success: true,
      history: user.history, // Completed/canceled orders
    });
  } catch (error) {
    console.error("Error fetching history orders:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
router.get("/history/:id", validateAccessToken, async (req, res) => {
  try {
    const { email } = req.user; // Kullanıcının e-posta adresini al
    const { id } = req.params; // URL parametresinden id'yi al


    // Kullanıcıyı e-posta adresi ile bul ve 'history' alanını doldur
    const user = await User.findOne({ email }).populate({
      path: "history",
      match: { _id: id }, // Belirtilen id'ye göre eşleşen siparişi getir
      populate: [
        {
          path: "items.product", // Sipariş içindeki ürün detaylarını doldur
          select: "name price photo", // Ürün şemasından özel alanları seç
        },
        {
          path: "shop", // Her sipariş için dükkân detaylarını doldur
          select: "name logo address", // Dükkan şemasından özel alanları seç
        },
      ],
      select: "status totalPrice totalDiscountedPrice items shop statusHistory", // Sipariş şemasından almak istediğiniz alanlar
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Kullanıcının geçmiş siparişlerini dön
    const userHistory = user.history.find(
      (order) => order._id.toString() === id
    );

    if (!userHistory) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    return res.status(200).json({
      success: true,
      history: userHistory, // Belirtilen siparişi döndür
    });
  } catch (error) {
    console.error("Error fetching history orders:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});
router.get("/lastOrders", validateAccessToken, async (req, res) => {
  try {
    const { email } = req.user; // Assuming the user ID is stored in req.user after validation
    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // Find the user's last 10 orders, sorted by the most recent
    const orders = await Order.find({ user: user._id, loyalty: { $ne: true } }) // loyalty true olmayan siparişleri getir
      .sort({ _id: -1 }) // Siparişleri en son eklenen siparişten başlatarak sırala
      .populate("shop", "name address logo") // Shop alanını doldur, sadece name, address, ve logo alanlarını getir
      .limit(10); // Son 10 siparişi getir

    // Extract the shop logos from the orders
    const shopLogos = orders.map((order) => order.shop || null);

    // Respond with the shop logos
    return res.json({
      success: true,
      message: "All logos fetched",
      logos: shopLogos,
    });
  } catch (error) {
    console.error("Error getting last 10 orders:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to retrieve last orders" });
  }
});
router.put("/rate/:id", validateAccessToken, async (req, res) => {
  try {
    const { email } = req.user; // JWT token'dan email alınıyor
    const { productRating = null, shopRating = null } = req.body; // Rating verileri body'den alınıyor
    const { id } = req.params; // Sipariş ID'si URL parametrelerinden alınıyor

    // Kullanıcıyı email ile bul
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Siparişi bul
    const order = await Order.findOne({
      _id: id,
      user: user._id,
      status: "delivered",
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const existingRating = order.rating.product;

    if (!existingRating) {
      order.rating = {
        product: productRating || null,
        shop: shopRating || null,
      };
    }

    // Mağaza ve ürün puanlarını güncelle
    const shop = await Shop.findById(order.shop);
    if (shop && shopRating) {
      shop.rating = roundToTwoDecimals(
        (shop.rating * shop.ratingCount + shopRating) / (shop.ratingCount + 1)
      );
      shop.ratingCount += 1;
      await shop.save();
    }

    if (productRating) {
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product) {
          const ratingValue = Number(order.rating.product);
          if (isNaN(ratingValue)) {
            return res.status(400).json({ message: "Invalid product rating" });
          }

          if (!user.extraDetails) {
            user.extraDetails = { overAllRating: { rating: 0, count: 0 } };
          } else if (!user.extraDetails.overAllRating) {
            user.extraDetails.overAllRating = { rating: 0, count: 0 };
          }

          user.extraDetails.overAllRating.count += 1;
          user.extraDetails.overAllRating.rating = roundToTwoDecimals(
            (user.extraDetails.overAllRating.rating *
              (user.extraDetails.overAllRating.count - 1) +
              ratingValue) /
              user.extraDetails.overAllRating.count
          );

          product.rating = roundToTwoDecimals(
            (product.rating * product.ratingCount + ratingValue) /
              (product.ratingCount + 1)
          );
          product.ratingCount += 1;
          await product.save();
        }
      }
    }

    // Değişiklikleri kaydet
    await order.save();
    await user.save();

    return res.status(200).json({ message: "Rating updated successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// For Testing
router.put("/change-plan", validateAccessToken, async (req, res) => {
  try {
    const { email } = req.user;
    const { category } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (category !== "loyalty") {
      user.category = category;
    } else {
      user.loyalty = 10;
      user.category = "standard";
    }
    await user.save();
    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});
// Best Sellers
router.get("/bestsellers", validateAccessToken, extraController.getBestSellers);
// Update Location
router.put(
  "/update-location",
  validateAccessToken,
  extraController.updateLocation
);
// Notifications
router.get(
  "/notifications",
  validateAccessToken,
  extraController.getNotifications
);
// Send Invoice
router.post(
  "/send-invoice/:id",
  validateAccessToken,
  extraController.sendInvoice
);
// Refer a friend
router.post(
  "/refer-a-friend",
  validateAccessToken,
  extraController.referAFriend
);
// FingerTips
router.get("/fingertips", validateAccessToken, extraController.getFingerTips);

module.exports = router;
