const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Order = require("../schemas/Order"); // Order model
const Product = require("../schemas/Product"); // Product model
const User = require("../schemas/User"); // User model
const Partner = require("../schemas/Partner"); // Partner model
const validateAccessToken = require("../middlewares/validateToken");

router.post("/", validateAccessToken, async (req, res) => {
  try {
    const { orderedItems, shopId, message } = req.body;

    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const shop = await Partner.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const productIds = orderedItems.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });

    const validItems = orderedItems.every((item) => {
      const product = products.find(
        (p) => p._id.toString() === item.productId.toString()
      );
      return product && product.shop.id.toString() === shopId.toString();
    });

    if (!validItems) {
      return res
        .status(400)
        .json({
          message: "One or more items are invalid or not in the specified shop",
        });
    }

    const totalPrice = orderedItems.reduce((sum, item) => {
      const product = products.find(
        (p) => p._id.toString() === item.productId.toString()
      );
      return sum + item.productCount * (product.price || 0);
    }, 0);

    const totalDiscountedPrice = orderedItems.reduce((sum, item) => {
      const product = products.find(
        (p) => p._id.toString() === item.productId.toString()
      );
      return sum + item.productCount * (product.discountedPrice || 0);
    }, 0);

    const newOrder = new Order({
      user: userId,
      items: orderedItems.map((item) => ({
        product: item.productId,
        quantity: item.productCount,
        price: products.find(
          (p) => p._id.toString() === item.productId.toString()
        ).price,
        discount: products.find(
          (p) => p._id.toString() === item.productId.toString()
        ).discount,
        discountedPrice: products.find(
          (p) => p._id.toString() === item.productId.toString()
        ).discountedPrice,
      })),
      shop: shopId,
      totalPrice,
      totalDiscountedPrice,
      message,
    });

    // Save the order and update the user's order list
    const savedOrder = await newOrder.save();
    await User.findByIdAndUpdate(userId, { $push: { orders: savedOrder._id } });

    // Return the saved order
    res.status(201).json(savedOrder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating order", error });
  }
});

module.exports = router;
