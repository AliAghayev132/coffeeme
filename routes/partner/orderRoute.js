const express = require("express");
const router = express.Router();
const Partner = require("../../schemas/Partner");
const Order = require("../../schemas/Order");
const User = require("../../schemas/User");
const validateAccessToken = require("../../middlewares/validateToken");
const {
  PARTNERS_CONNECTIONS,
  USERS_CONNECTIONS,
} = require("../../utils/socket/websokcetUtil");
const checkStreak = require("../../utils/user/checkStreak");

router.get("/", validateAccessToken, async (req, res) => {
  try {
    const { username } = req.user;
    const partner = await Partner.findOne({ username }).populate({
      path: "orders",
      populate: [
        {
          path: "user",
          select: "firstname secondname email phone", // Add other fields you need here
        },
        {
          path: "items.product",
          select: "name category price", // Adjust fields based on your Product schema
        },
      ],
    });
    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });
    }
    const ordersWithUserDetails = partner.orders.map((order) => ({
      _id: order._id,
      items: order.items.map((item) => ({
        _id: item._id,
        product: {
          name: item.product.name,
          category: item.product.category,
          price: item.product.price,
        },
        quantity: item.quantity,
        price: item.price,
        discount: item.discount,
        discountedPrice: item.discountedPrice,
        size: item.size,
      })),
      shop: order.shop,
      totalPrice: order.totalPrice,
      totalDiscountedPrice: order.totalDiscountedPrice,
      message: order.message,
      status: order.status,
      statusHistory: order.statusHistory,
      user: {
        firstname: order.user.firstname,
        secondname: order.user.secondname,
        email: order.user.email,
        phone: order.user.phone,
        _id: order.user._id,
      },
    }));

    return res.status(200).json({
      success: true,
      message: "All orders got",
      orders: ordersWithUserDetails,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
// Status Change
router.put("/:id", validateAccessToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, data } = req.body;

    // Find the order by ID
    const order = await Order.findById(id).populate("shop user");
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Update order status and preparing time if applicable
    order.status = status;
    if (status === "preparing" && data?.preparingTime) {
      order.preparingTime = data.preparingTime;
    }

    const [partner, user] = await Promise.all([
      Partner.findOne({ shop: order.shop }),
      User.findById(order.user),
    ]);

    if (!partner || !user) {
      return res.status(404).json({
        success: false,
        message: !partner ? "Partner not found" : "User not found",
      });
    }

    // If order status is delivered, update partner and user history
    let delivered = null;
    if (status === "delivered") {
      delivered = "DELIVERED";
      partner.orders = partner.orders.filter(
        (orderId) => orderId.toString() !== id
      );
      partner.history.push(order._id);
      partner.totalRevenue += order.totalDiscountedPrice || order.totalPrice;
      partner.balance += order.totalDiscountedPrice;
      user.orders = user.orders.filter((orderId) => orderId.toString() !== id);
      user.history.push(order._id);
      if (user.category !== "premium") {
        // streakPremium
        if (
          (user.loyalty !== 0 &&
            !order.loyalty &&
            user.category === "streakPremium") ||
          (!order.loyalty && user.category === "standard")
        )
          if (user.loyalty < 10) {
            ++user.loyalty;
          }

        if (checkStreak(user.streak)) {
          console.log("Steak work");
          user.streak = {
            count: user.streak.count + 1,
            lastOrderDate: new Date(),
          };
        } else {
          console.log("Streak not work");
          user.streak = {
            count: 1,
            lastOrderDate: new Date(),
          };
        }
      }
    }

    if (status === "cancelled" && order.loyalty) {
      user.loyalty = 10;
      partner.orders = partner.orders.filter(
        (orderId) => orderId.toString() !== id
      );
      partner.history.push(order._id);

      user.orders = user.orders.filter((orderId) => orderId.toString() !== id);
      user.history.push(order._id);

      const refundAmount = order.totalDiscountedPrice || order.totalPrice;
      user.balance += refundAmount;
    }

    // Notify partner via WebSocket
    if (PARTNERS_CONNECTIONS[partner._id]) {
      PARTNERS_CONNECTIONS[partner._id].send(
        JSON.stringify({
          type: "ORDER_STATUS",
          state: delivered ? delivered : "UPDATE",
        })
      );
    }

    // Notify user via WebSocket if applicable
    if (USERS_CONNECTIONS[user._id]) {
      USERS_CONNECTIONS[user._id].send(
        JSON.stringify({
          type: "ORDER_STATUS",
          state: status,
          order: order,
        })
      );
    }

    // Save order, partner, and user updates in parallel
    await Promise.all([order.save(), partner.save(), user.save()]);

    return res
      .status(200)
      .json({ success: true, message: "Order status updated successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
