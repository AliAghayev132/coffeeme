const express = require("express");
const router = express.Router();
// Utils
const validateAccessToken = require("../../middlewares/validateToken");
// Models
const User = require("../../schemas/User");
const Order = require("../../schemas/Order");
const Shop = require("../../schemas/Shop");

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
          select: "name price photo", // Select specific fields from the Product schema
        },
        {
          path: "shop", // Populate shop details for each order
          select: "name logo address", // Select specific fields from the Shop schema
        },
      ],
      select: "status totalPrice totalDiscountedPrice items shop statusHistory", // Fields to retrieve from the Order schema
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

    console.log({ id });

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
    const orders = await Order.find({ user: user._id })
      .sort({ _id: -1 }) // Sort orders by the most recent first
      .populate("shop", "name address logo") // Populate the shop field with only the logo
      .limit(10); // Limit to the last 10 orders

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
    const { productRating, shopRating } = req.body; // Rating verileri body'den alınıyor
    const { id } = req.params; // Sipariş ID'si URL parametrelerinden alınıyor

    console.log(productRating, shopRating, id);

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
        product: productRating,
        shop: shopRating,
      };
    }

    // Mağaza ve ürün puanlarını güncelle
    const shop = await Shop.findById(order.shop);
    if (shop) {
      shop.rating =
        (shop.rating * shop.ratingCount + shopRating) / (shop.ratingCount + 1);
      shop.ratingCount += 1;
      await shop.save();
    }

    for (const item of order.items) {
      const product = await Product.findById(item.product); // Her bir item'in product'ını al
      if (product) {
        // Rating ve ratingCount hesaplaması
        product.rating =
          (product.rating * product.ratingCount + item.productRating) /
          (product.ratingCount + 1);
        product.ratingCount += 1;
        await product.save(); // Ürünü kaydet
      }
    }

    // Değişiklikleri kaydet
    await order.save();

    return res.status(200).json({ message: "Rating updated successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
