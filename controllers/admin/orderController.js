// Schemas
const User = require("../../schemas/User");
const Order = require("../../schemas/Order");
const Partner = require("../../schemas/Partner");
// Utils
const checkReferral = require("../../utils/user/checkReferral");
const { checkStreakDay } = require("../../utils/user/checkStreak");
const balanceActivity = require("../../utils/user/balanceActivity");
const sendOrderDetails = require("../../utils/partner/sendOrderDetails");
const updateDailyReport = require("../../utils/partner/updateSalesReport");
const { socketMessageSender } = require("../../utils/socket/websocketUtil");

const getOrders = async (req, res) => {
  try {
    const { username } = req.user;
    const partner = await Partner.findOne({ username }).populate({
      path: "orders",
      populate: [
        {
          path: "user",
          select:
            "firstname secondname email phone birthDate extraDetails overAllRating orders",
          populate: [
            {
              path: "extraDetails.mostOrderedThreeProducts",
              select: "name",
            },
            {
              path: "extraDetails.mostGoingCoffeeShop",
              select: "name",
            },
          ],
        },
        {
          path: "items.product",
          select: "name category price type additions",
        },
      ],
    });

    if (!partner)
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });

    partner.orders = await Promise.all(
      partner.orders.map(async (order) => {
        const lastOrder = await Order.findOne({
          user: order.user._id,
          _id: { $ne: order._id },
        })
          .sort({ _id: -1 })
          .populate("items.product", "name price");

        const lastRatedOrder = await Order.findOne({
          user: order.user._id,
          "rating.product": { $ne: null },
        }).sort({ _id: -1 });

        order.lastOrder = lastOrder;
        order.lastRatedOrder = lastRatedOrder;

        return order;
      })
    );

    const ordersWithUserDetails = partner.orders.map((order) => ({
      _id: order._id,
      id: order.id,
      items: order.items.map((item) => ({
        _id: item._id,
        product: {
          name: item.product.name,
          category: item.product.category,
          price: item.product.price,
        },
        type: item.type,
        additions: item.additions,
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
      preparingTime: order.preparingTime,
      user: {
        comingCount: partner.customers.find((customer) =>
          customer.user.equals(order.user._id)
        ),
        firstname: order.user.firstname,
        secondname: order.user.secondname,
        lastOrder: order.lastOrder,
        lastRatedOrder: order.lastRatedOrder,
        email: order.user.email,
        phone: order.user.phone,
        _id: order.user._id,
        birthDate: order.user.birthDate,
        extraDetails: order.user.extraDetails,
        overAllRating: order.user.overAllRating,
      },
    }));

    return res.status(200).json({
      success: true,
      message: "All orders got",
      orders: ordersWithUserDetails,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, data } = req.body;
    const { username } = req.user;

    const order = await Order.findById(id).populate("shop user").populate({
      path: "items.product",
      select: "sales",
    });
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    order.status = status;
    if (status === "preparing" && data?.preparingTime) {
      order.preparingTime = data.preparingTime;
    }

    const [partner, user] = await Promise.all([
      Partner.findOne({ shop: order.shop, username }),
      User.findById(order.user),
    ]);

    if (!partner || !user) {
      return res.status(404).json({
        success: false,
        message: !partner ? "Partner not found" : "User not found",
      });
    }

    let delivered = null;
    if (status === "delivered") {
      delivered = "DELIVERED";
      await checkReferral(user);

      sendOrderDetails(user.email, {
        totalPrice: order.totalPrice,
        totalDiscountedPrice: order.totalDiscountedPrice,
      });

      partner.orders = partner.orders.filter(
        (orderId) => orderId.toString() !== id
      );
      const customerUser = partner.customers.find((customer) =>
        customer.user.equals(user._id)
      );

      if (!customerUser) {
        partner.customers.push({ user: user._id, count: 1 });
      } else {
        ++customerUser.count;
      }

      partner.history.push(order._id);
      partner.totalRevenue = parseFloat(
        (
          partner.totalRevenue +
          order.totalPrice -
          (order.totalPrice * order.shop.discountPercentage) / 100
        ).toFixed(2)
      );
      partner.balance = parseFloat(
        (
          partner.balance +
          order.totalPrice -
          (order.totalPrice * order.shop.discountPercentage) / 100
        ).toFixed(2)
      );
      user.orders = user.orders.filter((orderId) => orderId.toString() !== id);
      user.history.push(order._id);
      user.visitedCoffeeShops.push(partner.shop._id);
      for (const item of order.items) {
        item.product.sales += item.quantity;
        await item.product.save();
        user.orderedProducts.push(item.product._id);
      }

      if (user.category !== "premium") {
        if (
          (user.loyalty !== 0 &&
            !order.loyalty &&
            user.category === "streakPremium") ||
          (!order.loyalty && user.category === "standard")
        )
          if (user.loyalty < 10) {
            ++user.loyalty;
          }

        if (checkStreakDay({ streak: user.streak })) {
          user.streak = {
            count: user.streak.count + 1,
            lastOrderDate: Date.now(),
          };
        } else {
          user.streak = {
            count: 1,
            lastOrderDate: Date.now(),
          };
        }
      }
    }

    if (status === "cancelled") {
      partner.orders = partner.orders.filter(
        (orderId) => orderId.toString() !== id
      );

      partner.history.push(order._id);
      user.orders = user.orders.filter((orderId) => orderId.toString() !== id);
      user.history.push(order._id);

      if (order.loyalty) {
        user.loyalty = 10;
      } else {
        const refundAmount = order.totalDiscountedPrice || order.totalPrice;
        user.balance += refundAmount;
        balanceActivity(user, {
          category: "refund",
          title: `${order.shop.name} ${order.shop.shortAddress}`,
          amount: refundAmount,
        });
      }
    }

    socketMessageSender("partner", partner._id, {
      type: "ORDER_STATUS",
      state: delivered ? delivered : "UPDATE",
    });

    socketMessageSender("user", user._id, {
      type: "ORDER_STATUS",
      state: status,
      order: order,
    });

    await Promise.all([order.save(), partner.save(), user.save()]);

    if (status === "delivered") updateDailyReport(user, partner._id);

    return res
      .status(200)
      .json({ success: true, message: "Order status updated successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { getOrders, updateOrderStatus };
