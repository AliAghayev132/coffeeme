const Order = require("../../schemas/Order");
const User = require("../../schemas/User");
const Partner = require("../../schemas/Partner");
const cron = require("node-cron");
const {
  PARTNERS_CONNECTIONS,
  USERS_CONNECTIONS, // Import the USER_CONNECTIONS
} = require("../socket/websokcetUtil");

const EXPIRATION_TIME_MINS = 5;

const cancelExpiredOrders = async () => {
  try {
    const expirationTime = new Date(
      Date.now() - EXPIRATION_TIME_MINS * 60 * 1000
    );
    console.log("orderCron", { expirationTime });
    const expiredOrders = await Order.find({
      status: "pending",
      "statusHistory.changedAt": { $lte: expirationTime },
    });

    console.log("Expired Orders:", expiredOrders);

    if (expiredOrders.length === 0) {
      console.log("No expired orders found.");
      return;
    }

    // Process each expired order
    const userPromises = [];
    const partnerPromises = [];

    for (const order of expiredOrders) {
      userPromises.push(handleUserHistory(order));
      partnerPromises.push(handlePartnerHistory(order));
      updateOrderStatus(order._id);
    }

    await Promise.all(userPromises);
    await Promise.all(partnerPromises);

    console.log(
      `${expiredOrders.length} orders cancelled and added to user and partner history.`
    );
  } catch (error) {
    console.error("Error checking expired orders:", error);
  }
};

const handleUserHistory = async (order) => {
  try {
    const user = await User.findById(order.user);
    if (!user) return;
    user.orders = user.orders.filter(
      (o) => o.toString() !== order._id.toString()
    );
    if (!user.history) {
      user.history = [];
    }
    user.history.push(order._id);
    const refundAmount = order.totalDiscountedPrice || order.totalPrice;
    user.balance += refundAmount; // Refund the amount to user's balance

    // Notify user via WebSocket
    if (USERS_CONNECTIONS[user._id]) {
      console.log("Here worked");
      
      USERS_CONNECTIONS[user._id].send(
        JSON.stringify({
          type: "ORDER_STATUS",
          state: "CANCEL",
        })
      );
    }

    // Save the updated user document
    await user.save();
  } catch (error) {
    console.error(`Error updating user history for order ${order._id}:`, error);
  }
};

const handlePartnerHistory = async (order) => {
  try {
    const partner = await Partner.findOne({ shop: order.shop });
    if (!partner) return;

    partner.orders = partner.orders.filter(
      (o) => o.toString() !== order._id.toString()
    );

    if (!partner.history) {
      partner.history = [];
    }
    partner.history.push(order._id);

    // Notify partner via WebSocket
    if (PARTNERS_CONNECTIONS[partner._id]) {
      PARTNERS_CONNECTIONS[partner._id].send(
        JSON.stringify({
          type: "ORDER_STATUS",
          state: "CANCEL",
        })
      );
    }

    // Save the updated partner document
    await partner.save();
  } catch (error) {
    console.error(
      `Error updating partner history for order ${order._id}:`,
      error
    );
  }
};

const updateOrderStatus = async (orderId) => {
  try {
    await Order.findByIdAndUpdate(orderId, {
      status: "cancelled",
    });
  } catch (error) {
    console.error(`Error updating order status for order ${orderId}:`, error);
  }
};

// Schedule the cron job
cron.schedule("* * * * *", cancelExpiredOrders);
