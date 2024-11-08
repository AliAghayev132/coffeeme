const Order = require("../../schemas/Order");
const User = require("../../schemas/User");
const Partner = require("../../schemas/Partner");
const cron = require("node-cron");
const {
  PARTNERS_CONNECTIONS,
  USERS_CONNECTIONS, // Import the USER_CONNECTIONS
} = require("../socket/websokcetUtil");

const EXPIRATION_TIME_MINS = 1;
const balanceActivity = require("../user/balanceActivity");

const cancelExpiredOrders = async () => {
  try {
    const expirationTime = new Date(
      Date.now() - EXPIRATION_TIME_MINS * 60 * 1000
    );
    const expiredOrders = await Order.find({
      status: "pending",
      "statusHistory.changedAt": { $lte: expirationTime },
    })
      .populate({
        path: "shop",
        select: "name",
      })
      .populate({
        path: "items.product", // items dizisindeki her bir ürün
        select: "name", // Sadece gerekli alanları seçiyoruz
      });

    if (expiredOrders.length) console.log("Expired Orders:", expiredOrders);

    // Process each expired order
    const userPromises = [];
    const partnerPromises = [];

    for (const order of expiredOrders) {
      userPromises.push(handleUserHistory(order));
      partnerPromises.push(handlePartnerHistory(order));
      await updateOrderStatus(order._id);
    }

    await Promise.all(userPromises);
    await Promise.all(partnerPromises);
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

    if (order.loyalty) {
      user.loyalty = 10;
    } else {
      const refundAmount = order.totalDiscountedPrice || order.totalPrice;
      balanceActivity(user, {
        category: "refund",
        title: `${shop.name} ${shop.shortAddress}`,
        amount: order.totalDiscountedPrice,
      });
      user.balance += refundAmount;
    }

    // Notify user via WebSocket
    if (USERS_CONNECTIONS[user._id]) {
      USERS_CONNECTIONS[user._id].send(
        JSON.stringify({
          orderId: order._id,
          type: "ORDER_STATUS",
          state: "cancelled",
          data: {
            shop: order.shop.name,
            products: order.items.product,
          },
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
          state: "cancelled",
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
    const order = await Order.findById(orderId);
    order.status = "cancelled";
    await order.save();
    console.log(order);
  } catch (error) {
    console.error(`Error updating order status for order ${orderId}:`, error);
  }
};

// Schedule the cron job
cron.schedule("* * * * *", cancelExpiredOrders);
