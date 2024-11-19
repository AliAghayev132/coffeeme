const express = require("express");
const router = express.Router();
const Partner = require("../../schemas/Partner");
const Order = require("../../schemas/Order");
const User = require("../../schemas/User");
const Referral = require("../../schemas/user/Referral");
const validateAccessToken = require("../../middlewares/validateToken");
const { socketMessageSender } = require("../../utils/socket/websokcetUtil");
const { checkStreakDay } = require("../../utils/user/checkStreak");
const mailSender = require("../../utils/mailsender");
const balanceActivity = require("../../utils/user/balanceActivity");

async function sendOrderDetails(email, data) {
  try {
    const mailResponse = await mailSender(
      email,
      "Sifariş mk",
      `<h1>
        ${data.totalPrice} 
        ${data.totalDiscountedPrice}
      </h1>`
    );
  } catch (error) {
    console.log("Error occurred while sending email: ", error);
    throw error;
  }
}

router.get("/", validateAccessToken, async (req, res) => {
  try {
    const { username } = req.user;
    const partner = await Partner.findOne({ username }).populate({
      path: "orders",
      populate: [
        {
          path: "user",
          select:
            "firstname secondname email phone birthDate extraDetails overAllRating orders", // Kullanıcı bilgileri ve extraDetails
          populate: [
            {
              path: "extraDetails.mostOrderedThreeProducts", // En çok sipariş edilen 3 ürünü ekle
              select: "name", // Ürün bilgileri
            },
            {
              path: "extraDetails.mostGoingCoffeeShop", // En çok gidilen kafe
              select: "name", // Kafe bilgileri (gerekirse alanları ayarla)
            },
          ],
        },
        {
          path: "items.product",
          select: "name category price type additions", // Adjust fields based on your Product schema
        },
      ],
    });

    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });
    }

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
      if (user.extraDetails.referredBy) {
        try {
          const referral = await Referral.findOneAndUpdate(
            {
              referredUserId: user._id,
              rewardGiven: false,
            },
            {
              rewardGiven: true,
            },
            { new: true }
          ).populate("referrerUserId");

          if (referral) user.balance += 1;
          if (referral.referrerUserId) {
            referral.referrerUserId.balance += 1;
          }
          balanceActivity(user, {
            category: "refer",
            title: `Refer a friend - ${referral.referrerUserId.firstname}`,
            amount: 1,
          });
          await referral.referrerUserId.save();
        } catch (error) {
          console.log(error);
        }
      }
      sendOrderDetails(user.email, {
        totalPrice: order.totalPrice,
        totalDiscountedPrice: order.totalDiscountedPrice,
      });
      delivered = "DELIVERED";
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
      partner.totalRevenue += parseFloat(
        (
          order.totalPrice -
          (order.totalPrice * order.shop.discountPercentage) / 100
        ).toFixed(2)
      );
      partner.balance += parseFloat(
        (
          order.totalPrice -
          (order.totalPrice * order.shop.discountPercentage) / 100
        ).toFixed(2)
      );
      user.orders = user.orders.filter((orderId) => orderId.toString() !== id);
      user.history.push(order._id);
      user.visitedCoffeeShops.push(partner.shop._id);
      order.items.forEach((item) => user.orderedProducts.push(item.product));
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

    // Notify partner and user via WebSocket
    socketMessageSender("partner", partner._id, {
      type: "ORDER_STATUS",
      state: delivered ? delivered : "UPDATE",
    });

    socketMessageSender("user", user._id, {
      type: "ORDER_STATUS",
      state: status,
      order: order,
    });

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
