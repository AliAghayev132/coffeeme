const express = require("express");
const router = express.Router();
const Order = require("../../schemas/Order"); // Order model
const Product = require("../../schemas/Product"); // Product model
const User = require("../../schemas/User"); // User model
const Shop = require("../../schemas/Shop");
const Partner = require("../../schemas/Partner");
const validateAccessToken = require("../../middlewares/validateToken");

router.get("/", validateAccessToken, async (req, res) => {
  try {
    const { _id } = req.user;
    const user = User.findById(_id).populate("Order");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const orders = user.orders;
    return res.status(200).json({ orders });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server errro" });
  }
});
router.post("/", validateAccessToken, async (req, res) => {
  try {
    const { orderedItems, shopId, message } = req.body;
    const userId = req.user._id;

    if (!orderedItems || orderedItems.length <= 0) {
      return res.status(400).json({ message: "No ordered items provided" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.orders.length >= 3) {
      return res.status(400).json({ message: "You have reached the order limit" });
    }

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const productIds = orderedItems.map(item => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });

    
    const validItems = orderedItems.every(item => {
      const product = products.find(p => p._id.toString() === item.productId.toString());
      if (!product || product.shop.id.toString() !== shopId.toString()) {
        return false;
      }

      

      const selectedSize = product.sizes.find(size => size.size === item.productSize);
      return selectedSize !== undefined;
    });

    if (!validItems) {
      return res.status(400).json({
        message: "One or more items are invalid, or the selected size does not exist for the product",
      });
    }

    const totalPrice = orderedItems.reduce((sum, item) => {
      const product = products.find(p => p._id.toString() === item.productId.toString());
      const selectedSize = product.sizes.find(size => size.size === item.selectedSize);
      return sum + item.productCount * (selectedSize.price || 0);
    }, 0);

    const totalDiscountedPrice = orderedItems.reduce((sum, item) => {
      const product = products.find(p => p._id.toString() === item.productId.toString());
      const selectedSize = product.sizes.find(size => size.size === item.selectedSize);
      return sum + item.productCount * (selectedSize.discountedPrice || 0);
    }, 0);

    const newOrder = new Order({
      user: userId,
      items: orderedItems.map(item => {
        const product = products.find(p => p._id.toString() === item.productId.toString());
        const selectedSize = product.sizes.find(size => size.size === item.selectedSize);
        return {
          product: item.productId,
          quantity: item.productCount,
          price: selectedSize.price,
          discount: selectedSize.discount,
          discountedPrice: selectedSize.discountedPrice,
        };
      }),
      shop: shopId,
      totalPrice,
      totalDiscountedPrice,
      message,
    });

    const savedOrder = await newOrder.save();
    await User.findByIdAndUpdate(userId, { $push: { orders: savedOrder._id } });
    await Partner.findOneAndUpdate(
      { shop: shopId },
      { $push: { orders: savedOrder._id } }
    );

    return res.status(201).json(savedOrder);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error creating order", error });
  }
});

module.exports = router;
