const Admin = require("../../schemas/Admin");
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
  console.log("Hello");
  try {

    const { email } = req.user; // Kullanıcı adını al
    const admin = await Admin.findOne({ email });
    console.log(admin);

    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });
    }

    const notifications = await Notification.find({
      "sender.role": "partner",
    }).populate({
      path: "sender.id",
      select: "username", // Sadece username alanını alıyoruz
      model: "Partner", // Referans modeli belirtiyoruz
    });

    console.log(notifications);

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

module.exports = {
  // getMenu,
  // getSubscribers,
  // createNewNotification,
  getPartnerNotifications,
};
