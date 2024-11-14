const User = require("../../schemas/User");
const Admin = require("../../schemas/Admin");
const FingerTips = require("../../schemas/FingerTips");
const Notification = require("../../schemas/Notification");

// const getMenu = async (req, res) => {
//   try {
//     const { username } = req.user;
//     const partner = await Partner.findOne({ username }).populate({
//       path: "shop",
//       populate: {
//         path: "products",
//         model: "Product", // Eğer Product modelinin ismi buysa
//       },
//     });

//     if (!partner) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Partner not found" });
//     }

//     // Partner ve shop bilgileri döndürülüyor
//     return res.status(200).json({
//       success: true,
//       products: partner.shop.products,
//       shop: {
//         _id: partner.shop._id,
//         percentage: partner.shopPercentage,
//       },
//     });
//   } catch (error) {
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

// const getSubscribers = async (req, res) => {
//   try {
//     const { username } = req.user;
//     const partner = await Partner.findOne({ username }).populate({
//       path: "followers",
//       select:
//         "firstname secondname birthdate gender extraDetails.mostGoingCoffeeShop",
//       populate: {
//         path: "extraDetails.mostGoingCoffeeShop",
//         select: "name",
//       },
//     });

//     if (!partner) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Partner not found" });
//     }

//     // Partner ve shop bilgileri döndürülüyor
//     return res.status(200).json({
//       success: true,
//       followers: partner.followers,
//     });
//   } catch (error) {
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

// const createNewNotification = async (req, res) => {
//   try {
//     const { username } = req.user;
//     const partner = await Partner.findOne({ username });

//     if (!partner) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Partner not found" });
//     }

//     // İstekten bildirim verilerini al
//     const { title, message, category } = req.body;

//     // Yeni bildirim oluştur
//     const newNotification = new Notification({
//       title,
//       message,
//       category,
//       sender: {
//         role: "partner", // Gönderen rolü "partner"
//         id: partner._id, // Partnerin ID'si
//       },
//       status: "pending", // Varsayılan durum "pending"
//       date: Date.now(), // Oluşturulma tarihi
//     });

//     // Yeni bildirimi veritabanına kaydet
//     await newNotification.save();

//     // Partnerin notifications dizisine bildirimi ekle
//     partner.notifications.push(newNotification._id);

//     // Partneri güncelle
//     await partner.save();

//     // Başarılı yanıt döndür
//     return res.status(201).json({
//       success: true,
//       message: "Notification created successfully",
//       notification: newNotification,
//     });
//   } catch (error) {
//     console.error(error); // Hata günlüğü
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

const getPartnerNotifications = async (req, res) => {
  try {
    const { email } = req.user; // Kullanıcı adını al
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });
    }

    const notifications = await Notification.find({
      "sender.role": "partner",
    });

    // Partnerin bildirimlerini döndür
    return res.status(200).json({
      success: true,
      notifications, // Bildirimleri döndür
    });
  } catch (error) {
    console.error(error); // Hata günlüğü
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const updatePartnerNotification = async (req, res) => {
  try {
    const { email } = req.user; // Get the admin's email
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found" });
    }

    const {
      notificationId,
      title,
      message,
      rejectionReason,
      status,
      category,
    } = req.body;

    // Check if notificationId is provided
    if (!notificationId) {
      return res
        .status(400)
        .json({ success: false, message: "Notification ID is required" });
    }
    const notification = await Notification.findById(notificationId).populate({
      path: "sender.id", // Populate the partner information from the sender
      model: "Partner", // The model to populate from
    });

    const followerIds = notification.sender.id.followers;

    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    // Update notification details
    notification.title = title || notification.title;
    notification.message = message || notification.message;
    notification.rejectionReason =
      rejectionReason || notification.rejectionReason;
    notification.category = category || notification.category;

    if (notification.status !== "pending") {
      return res
        .status(400)
        .json({ success: false, message: "This notification already updated" });
    }

    // Handle sending notifications based on status and category
    if (status === "rejected") {
      notification.status = "rejected";
      notification.statusHistory.push({ status, date: Date.now() });
      notification.date = Date.now();
      await notification.save();

      return res.status(200).json({
        success: true,
        message:
          "Notification status is rejected. No users will receive this notification.",
      });
    } else if (status === "published") {
      let usersToNotify;

      // Determine which users to notify based on category
      switch (category) {
        case "allUsers":
          usersToNotify = await User.find(); // All users
          break;
        case "premiumUsers":
          usersToNotify = await User.find({ category: "premium" }); // Only premium users
          break;
        case "freeUsers":
          usersToNotify = await User.find({ category: "standard" }); // Only free users
          break;
        case "allCustomers":
          // Assuming all customers are users who follow the partner's shop
          usersToNotify = await User.find({ follows: notification.shop });
          break;
        case "subscribers":
          usersToNotify = await User.find({ _id: { $in: followerIds } }); // Kullanıcıları bul
          break;
        default:
          return res
            .status(400)
            .json({ success: false, message: "Invalid category" });
      }

      // Notify the users (this part can be expanded based on how notifications are sent)

      for (const user of usersToNotify) {
        user.notifications.push(notification._id);
        await user.save();
      }

      notification.status = status || notification.status;
      notification.statusHistory.push({ status, date: Date.now() });
      notification.date = Date.now();
      await notification.save();

      return res.status(200).json({
        success: true,
        message: "Notification updated and sent",
        usersNotified: usersToNotify.length,
      });
    }

    return res
      .status(404)
      .json({ success: false, message: "bruh fix this after" });
  } catch (error) {
    console.error("Error updating partner notification:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the notification",
    });
  }
};

const getFingerTips = async (req, res) => {
  try {
    const { email } = req.user;
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });
    }

    const fingerTips = await FingerTips.findOne({});

    res.status(200).json({
      message: "All fingersTips retrieved",
      success: true,
      fingerTips,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
const addShopToFingerTips = async (req, res) => {
  try {
    const { email } = req.user;
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });
    }
    const { id } = req.body;
    let fingerTips = await FingerTips.findOne({});
    if (!fingerTips) fingerTips = new FingerTips({});

    fingerTips.coffeeShops.push(id);

    res.status(200).json({
      message: "All fingersTips retrieved",
      success: true,
      fingerTips,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
const removeShopFromFingerTips = async (req, res) => {
  try {
    const { email } = req.user;
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });
    }
    const { id } = req.body;
    const fingerTips = await FingerTips.findOne({});
    fingerTips.coffeeShops = fingerTips.coffeeShops.filter(
      (shop) => shop !== id
    );
    await fingerTips.save();

    res.status(200).json({
      message: "All fingersTips retrieved",
      success: true,
      fingerTips,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  // getMenu,
  // getSubscribers,
  // createNewNotification,
  removeShopFromFingerTips,
  addShopToFingerTips,
  getFingerTips,
  updatePartnerNotification,
  getPartnerNotifications,
};
