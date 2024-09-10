const Order = require("../../schemas/Order");
const User = require("../../schemas/User");
const Partner = require("../../schemas/Partner");
const cron = require("node-cron");
const { PARTNERS_CONNECTIONS } = require("../socket/websokcetUtil");

cron.schedule("* * * * *", async () => {
  try {
    const expirationTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
    console.log("orderCron", { expirationTime });

    // Find expired orders that are still pending
    const expiredOrders = await Order.find({
      status: "pending",
      "statusHistory.changedAt": { $lte: expirationTime }
    });
    console.log({ expiredOrders });

    if (expiredOrders.length > 0) {
      // Process each expired order
      for (const order of expiredOrders) {
        // Add the cancelled order to the user's history
        const user = await User.findById(order.user);
        if (user) {
          // Remove the cancelled order from user's active orders
          user.orders = user.orders.filter(o => o.toString() !== order._id.toString());

          // Add the cancelled order to user's history
          if (!user.history) {
            user.history = [];
          }
          user.history.push(order._id);

          // Save the updated user document
          await user.save();
        }

        // Add the cancelled order to the partner's history
        const partner = await Partner.findOne({ shop: order.shop });
        if (partner) {
          // Remove the cancelled order from partner's active orders
          partner.orders = partner.orders.filter(o => o.toString() !== order._id.toString());
          // Add the cancelled order to partner's history
          if (!partner.history) {
            partner.history = [];
          }
          partner.history.push(order._id);
          console.log("orderCron", { partner });
          if (PARTNERS_CONNECTIONS[partner._id]) {
            PARTNERS_CONNECTIONS[partner._id].send(JSON.stringify({
              type: 'ORDER_STATUS',
              state: "CANCEL",
            }));
          }
          await partner.save();
        }

        // Update the order status and statusHistory
        await Order.findByIdAndUpdate(order._id, {
          status: "cancelled",
          $push: { statusHistory: { status: "cancelled", changedAt: new Date() } }
        });
      }

      console.log(`${expiredOrders.length} orders cancelled and added to user and partner history.`);
    }
  } catch (error) {
    console.error("Error checking expired orders:", error);
  }
});
