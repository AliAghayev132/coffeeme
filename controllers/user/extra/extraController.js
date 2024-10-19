const express = require("express");
const router = express.Router();
const User = require("../../../schemas/User");
const Partner = require("../../../schemas/Partner");
const Shop = require("../../../schemas/Shop");

const updateLocation = async (req, res) => {
  try {
    const { email } = req.user;
    const { latitude, longitude } = req.body;

    // Kullanıcıyı bul
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Kullanıcının konumuna yakın dükkanları bul
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
          maxDistance: 1000,
        },
      },
    ]);

    // Eğer dükkan bulunduyse partnerleri güncelle
    for (const shop of shops) {
      const partner = await Partner.findOne({ shop: shop._id }).populate(
        "shop"
      );
      if (partner) {
        // closeUsers dizisinde kullanıcıyı bul
        const userInCloseUsers = partner.closeUsers.find(
          (closeUser) => closeUser.userId.toString() === user._id.toString()
        );
        if (!userInCloseUsers) {
          // Kullanıcı closeUsers dizisine ekle
          partner.closeUsers.push({
            userId: user._id,
            lastLocationUpdate: Date.now(),
          });
          await partner.save(); // Partner kaydet
        }
      }
    }
    return res.status(200).json({ success: true, shops });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

module.exports = { updateLocation };
