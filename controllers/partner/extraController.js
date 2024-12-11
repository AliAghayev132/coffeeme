const Partner = require("../../schemas/Partner");
const Notification = require("../../schemas/Notification");
const Product = require("../../schemas/Product");
const Order = require("../../schemas/Order");

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
        "firstname secondname birthDate gender extraDetails.mostGoingCoffeeShop",
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
      path: "customers.user",
      select:
        "firstname secondname gender birthDate extraDetails overAllRating orders", // Kullanıcı bilgileri ve extraDetails
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
          options: { sort: { createdAt: -1 }, limit: 1 },
          select: "rating items",
          populate: {
            path: "items.product", // Ürün bilgilerini popüle et
            select: "name", // Yalnızca isim alanını al
          },
        },
      ],
    });

    partner.customers = await Promise.all(
      partner.customers.map(async (customer) => {
        // Get the most recent order for the customer
        const lastOrderPromise = Order.findOne({ user: customer.user._id })
          .sort({ _id: -1 }) // Sort by most recent order first
          .populate("items.product", "name price");
    
        // Get the most recent rated order for the customer
        const lastRatedOrderPromise = Order.findOne({
          user: customer.user._id,
          "rating.product": { $ne: null }, // Find an order that has a rating
        })
          .sort({ _id: -1 }) // Sort by most recent rating
          .populate("items.product", "name price");
    
        // Await for both promises to resolve
        const [lastOrder, lastRatedOrder] = await Promise.all([
          lastOrderPromise,
          lastRatedOrderPromise,
        ]);
    
        // Return a new object with the customer data and the additional orders
        return {
          ...customer._doc, // Spread existing customer data
          lastOrder,
          lastRatedOrder,
        };
      })
    );

    console.log(partner.customers);

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

    const partner = await Partner.findOne({ username }).populate({
      path: "closeUsers.user", // closeUsers'daki user alanını doldur
      select: "firstname secondname image lastLocationUpdate", // Geri dönecek alanlar
    });
    if (!partner)
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });

    return res.status(200).json({
      message: "All close users got",
      success: true,
      closeUsers: partner.closeUsers,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};
const getHistory = async (req, res) => {
  try {
    const { username } = req.user;
    const partner = await Partner.findOne({ username }).populate({
      path: "history",
      populate: [
        {
          path: "user",
          select: "firstname secondname email phone", // Add other fields you need here
        },
        {
          path: "items.product",
          select: "name category price rating", // Adjust fields based on your Product schema
        },
      ],
    });
    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });
    }

    return res.status(200).json({
      success: true,
      message: "All history delivered",
      history: partner.history,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GetSales
const getDailyReportToday = async (req, res) => {
  try {
    const { username } = req.user;
    const partner = await Partner.findOne({ username })
      .populate({
        path: "dailyReports",
        match: { date: new Date().toISOString().split("T")[0] },
        populate: [
          {
            path: "bestPerformingMembers",
            select: "firstname secondname image",
          },
          {
            path: "bestSellerProducts",
            select: "name photo",
          },
        ],
      })
      .lean();

    const results = await Promise.all(
      partner.dailyReports.map(async (dailyReport) => {
        const updatedMembers = await Promise.all(
          dailyReport.bestPerformingMembers.map(async (user) => {
            const customer = partner.customers.find((customer) => {
              return customer.user.toString() === user._id.toString();
            });
            return { ...user, count: customer ? customer.count : 0 }; // count ekleniyor
          })
        );

        const updatedProducts = await Promise.all(
          dailyReport.bestSellerProducts.map(async (product) => {
            const updatedProduct = await Product.findById(product._id).select(
              "sales"
            );
            return { ...product, count: updatedProduct.sales }; // count ekleniyor
          })
        );

        return {
          ...dailyReport,
          bestPerformingMembers: updatedMembers, // Güncellenmiş üyeler atanıyor
          bestSellerProducts: updatedProducts,
        };
      })
    );

    partner.dailyReports = results;

    if (!partner)
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });

    const todayReport = partner.dailyReports?.[0];

    res.status(200).json({ success: true, todayReport: todayReport });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// Today
// Last 7 days
// Month  //20  //27
// All Time
// Custom Day

module.exports = {
  getHistory,
  getMenu,
  getSubscribers,
  createNewNotification,
  getNotifications,
  getCustomers,
  getCloseUsers,
  getDailyReportToday,
};
