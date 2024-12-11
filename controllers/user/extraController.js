const User = require("../../schemas/User");
const Partner = require("../../schemas/Partner");
const Shop = require("../../schemas/Shop");
const Product = require("../../schemas/Product");
const Referral = require("../../schemas/user/Referral");
const FingerTips = require("../../schemas/FingerTips");

const sendOrderDetails = require("../../utils/partner/sendOrderDetails");

const updateLocation = async (req, res) => {
  try {
    const { email } = req.user;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ message: "Latitude and Longitude are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const shops = await Shop.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [longitude, latitude], // Kullanıcının lokasyonu
          },
          distanceField: "distance", // Mesafeyi saklayacağımız alan
          spherical: true, // Spherical model kullan
          minDistance: 0, // Mesafe sıfırdan başlasın
          maxDistance: 50000000000,
        },
      },
    ]);

    for (const shop of shops) {
      const partner = await Partner.findOne({ shop: shop._id }).populate(
        "shop"
      );
      if (partner) {
        // closeUsers dizisinde kullanıcıyı bul3
        const userInCloseUsers = partner.closeUsers.find(
          (closeUser) => closeUser.user.toString() === user._id.toString()
        );
        if (!userInCloseUsers) {
          partner.closeUsers.push({
            user: user._id,
            lastLocationUpdate: new Date(),
          });

          partner.recentCloseNotifications.push({
            user: user.id,
          });

          if (partner.recentCloseNotifications.length > 10) {
            partner.recentCloseNotifications.shift();
          }

          await partner.save();

          socketMessageSender("partner", partner._id, {
            type: "CLOSE_USER",
            data: {
              firstName: user.firstname,
              secondName: user.secondname,
            },
          });
        }
      }
    }

    user.lastLocationUpdate = {
      date: Date.now(),
      location: {
        latitude: latitude || 40.3852952, // Varsayılan değer ekleyin
        longitude: longitude || 49.8508528, // Varsayılan değer ekleyin
      },
    };

    await user.save();
    return res.status(200).json({ success: true, shops });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
const getNotifications = async (req, res) => {
  try {
    // Kullanıcıyı bulalım ve bildirimleri alalım
    const user = await User.findOne({ email: req.user.email }).populate({
      path: "notifications",
      populate: {
        path: "sender",
        select: "role id", // sender rolü ve id bilgisi
      },
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Bildirimleri düzenleyelim
    const notifications = await Promise.all(
      user.notifications.map(async (notification) => {
        // Eğer bildirim bir partner tarafından gönderildiyse, shop bilgilerini ekleyelim
        if (notification.sender.role === "partner") {
          // Partner'in id'sini kullanarak partneri bulalım
          const partner = await Partner.findById(
            notification.sender.id
          ).populate("shop", "_id name logo address");

          // Partner ve shop varsa, bildirim objesine shop ekleyelim
          if (partner && partner.shop) {
            // Burada notification'a shop ekliyoruz
            return {
              ...notification.toObject(), // notification'ı düz bir nesneye çeviriyoruz
              shop: partner.shop, // shop bilgisini ekliyoruz
            };
          }
        }
        // Eğer shop bilgisi eklenmediyse, bildirim objesini olduğu gibi döndürüyoruz
        return notification.toObject();
      })
    );

    // Tüm bildirimleri döndürelim
    return res.status(200).json({ success: true, notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
const getBestSellers = async (req, res) => {
  try {
    const { email } = req.user;
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const bestSellingProducts = await Product.find()
      .populate({
        path: "shop",
        select: "name shortAddress",
      })
      .sort({ rating: -1 })
      .limit(5);

    return res.status(200).json({
      success: true,
      message: "Best selling products retrieved successfully",
      bestSellingProducts,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
const sendInvoice = async (req, res) => {
  try {
    const { email } = req.user;
    const { id } = req.params;
    const user = await User.findOne({
      email,
    }).populate("history");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    const order = user.history.find((item) => item._id == id);
    sendOrderDetails(user.email, order);
    return res.status(200).json({
      success: true,
      message: "Invoice sended successfully",
      order: order,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
const referAFriend = async (req, res) => {
  try {
    const { email } = req.user;
    const { code } = req.body;
    const user = await User.findOne({
      email,
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (user.extraDetails.referredBy) {
      return res
        .status(400)
        .json({ success: false, message: "You already referred" });
    }

    if (user.extraDetails.referralCode == code) {
      return res
        .status(400)
        .json({ success: false, message: "You can't refer yourself" });
    }

    const referrerUser = await User.findOne({
      "extraDetails.referralCode": code, // Corrected field name
    });

    if (!referrerUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (referrerUser.extraDetails.referredBy === user._id) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" }); //sonra fixle
    }

    const referral = new Referral({
      referredUserId: user._id,
      referrerUserId: referrerUser._id,
    });

    user.extraDetails.referredBy = referrerUser._id;
    await user.save();
    await referral.save();

    res
      .status(200)
      .json({ success: true, message: "Your referral code worked", referral });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
const getFingerTips = async (req, res) => {
  try {
    const fingerTips = await FingerTips.findOne({}).lean();

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
  updateLocation,
  getNotifications,
  getBestSellers,
  getFingerTips,
  sendInvoice,
  referAFriend,
};
