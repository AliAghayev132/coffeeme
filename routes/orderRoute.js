const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Order = require("../schemas/Order"); // Order model
const Product = require("../schemas/Product"); // Product model
const User = require("../schemas/User"); // User model
const Partner = require("../schemas/Partner"); // Partner model
const validateAccessToken = require("../middlewares/validateToken");

// Endpoint: Create a new order
router.post("/", validateAccessToken, async (req, res) => {
  try {
    const { items, shopId, message } = req.body; // shopId yerine shop gönder

    // Token'dan user ID'sini almak
    const userId = req.user.id; 

    // User ve Shop'ları bulmak
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const shop = await Partner.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    // Geçerli ürünleri kontrol et
    const productIds = items.map(item => item.product);
    const products = await Product.find({ _id: { $in: productIds } });

    // Check if all items' products are valid and belong to the shop
    const validItems = items.every(item => {
      const product = products.find(p => p._id.toString() === item.product.toString());
      return product && product.shop.id.toString() === shopId.toString();
    });

    if (!validItems) {
      return res.status(400).json({ message: "One or more items are invalid or not in the specified shop" });
    }

    // Calculate total price and discounted price
    const totalPrice = items.reduce((sum, item) => {
      const product = products.find(p => p._id.toString() === item.product.toString());
      return sum + (item.quantity * (product.price || 0));
    }, 0);

    const totalDiscountedPrice = items.reduce((sum, item) => {
      const product = products.find(p => p._id.toString() === item.product.toString());
      return sum + (item.quantity * (product.discountedPrice || 0));
    }, 0);

    // Create a new order
    const newOrder = new Order({
      user: userId,
      items: items.map(item => ({
        product: item.product,
        quantity: item.quantity,
        price: products.find(p => p._id.toString() === item.product.toString()).price,
        discount: products.find(p => p._id.toString() === item.product.toString()).discount,
        discountedPrice: products.find(p => p._id.toString() === item.product.toString()).discountedPrice,
      })),
      shop: shopId,
      totalPrice,
      totalDiscountedPrice,
      message,
    });

    // Save the order
    const savedOrder = await newOrder.save();

    // Update user with the new order
    await User.findByIdAndUpdate(userId, { $push: { orders: savedOrder._id } });

    res.status(201).json(savedOrder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating order", error });
  }
});

module.exports = router;
