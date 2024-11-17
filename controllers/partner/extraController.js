const Partner = require("../../schemas/Partner");
const Notification = require("../../schemas/Notification");

const getMenu = async (req, res) => {
  try {
    const { username } = req.user;
    const partner = await Partner.findOne({ username }).populate({
      path: "shop",
      populate: {
        path: "products",
        model: "Product", // Eğer Product modelinin ismi buysa
      },
    });

    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });
    }

    // Partner ve shop bilgileri döndürülüyor
    return res.status(200).json({
      success: true,
      products: partner.shop.products,
      shop: {
        _id: partner.shop._id,
        percentage: partner.shopPercentage,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};
const getSubscribers = async (req, res) => {
  try {
    const { username } = req.user;
    const partner = await Partner.findOne({ username }).populate({
      path: "followers",
      select:
        "firstname secondname birthdate gender extraDetails.mostGoingCoffeeShop",
      populate: {
        path: "extraDetails.mostGoingCoffeeShop",
        select: "name",
      },
    });

    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });
    }

    // Partner ve shop bilgileri döndürülüyor
    return res.status(200).json({
      success: true,
      followers: partner.followers,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};
const createNewNotification = async (req, res) => {
  try {
    const { username } = req.user;
    const partner = await Partner.findOne({ username });

    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });
    }

    // İstekten bildirim verilerini al
    const { title, message, category } = req.body;

    // Yeni bildirim oluştur
    const newNotification = new Notification({
      title,
      message,
      category,
      sender: {
        role: "partner", // Gönderen rolü "partner"
        id: partner._id, // Partnerin ID'si
        username: partner.username,
      },
      status: "pending", // Varsayılan durum "pending"
      date: Date.now(), // Oluşturulma tarihi
    });

    // Yeni bildirimi veritabanına kaydet
    newNotification.statusHistory.push({ status: "pending", date: Date.now() });
    await newNotification.save();

    // Partnerin notifications dizisine bildirimi ekle
    partner.notifications.push(newNotification._id);

    // Partneri güncelle
    await partner.save();

    // Başarılı yanıt döndür
    return res.status(201).json({
      success: true,
      message: "Notification created successfully",
      notification: newNotification,
    });
  } catch (error) {
    console.error(error); // Hata günlüğü
    return res.status(500).json({ message: "Internal server error" });
  }
};
const getNotifications = async (req, res) => {
  try {
    const { username } = req.user; // Kullanıcı adını al
    const partner = await Partner.findOne({ username }).populate(
      "notifications"
    ); // Partneri bul ve notifications alanını doldur

    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });
    }

    // Partnerin bildirimlerini döndür
    return res.status(200).json({
      success: true,
      notifications: partner.notifications, // Bildirimleri döndür
    });
  } catch (error) {
    console.error(error); // Hata günlüğü
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
const getCustomers = async (req, res) => {
  try {
    const { username } = req.user;
    const partner = await Partner.findOne({ username }).populate({
      path: "customers",
      select:
        "firstname secondname gender birthdate extraDetails overAllRating orders", // Kullanıcı bilgileri ve extraDetails
      populate: [
        {
          path: "extraDetails.mostOrderedThreeProducts", // En çok sipariş edilen 3 ürünü ekle
          select: "name", // Ürün bilgileri
        },
        {
          path: "extraDetails.mostGoingCoffeeShop", // En çok gidilen kafe
          select: "name", // Kafe bilgileri (gerekirse alanları ayarla)
        },
        {
          path: "history",
          match: { "rating.product": { $ne: null } }, // rating.product değeri dolu olanları al
          options: { sort: { createdAt: -1 }, limit: 1 },
          select: "rating items",
          populate: {
            path: "items.product", // Ürün bilgilerini popüle et
            select: "name", // Yalnızca isim alanını al
          },
        },
      ],
    });
    return res.status(200).json({
      success: true,
      message: "All customers fetched",
      customers: partner.customers,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};
const getCloseUsers = async (req, res) => {
  try {
    const { username } = req.user;

    const partner = await Partner.findOne({ username }).populate("closeUsers");
    if (!partner)
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });

    console.log(partner.closeUsers);

    return res.status(200).json({
      message: "All close users got",
      success: true,
      closeUsers: partner.closeUsers,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getMenu,
  getSubscribers,
  createNewNotification,
  getNotifications,
  getCustomers,
  getCloseUsers,
};
