const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Order = require("../schemas/Order"); // Order model
const Product = require("../schemas/Product"); // Product model
const User = require("../schemas/User"); // Product model
const validateAccessToken = require("../middlewares/validateToken");

router.post("/", validateAccessToken, async (req, res) => {
  try {
    const { user, items, shop, message } = req.body;

    const newOrder = new Order({
      user,
      items: enrichedItems, // Önceden hesaplanan ürün verileri
      shop,
      totalPrice,
      totalDiscountedPrice,
      message,
    });

    const savedOrder = await newOrder.save();

    await User.findByIdAndUpdate(user, { $push: { orders: savedOrder._id } });

    res.status(201).json(savedOrder);
  } catch (error) {
    res.status(500).json({ message: "Error creating order", error });
  }
});
