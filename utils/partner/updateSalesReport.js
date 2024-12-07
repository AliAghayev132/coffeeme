const DailyReport = require("../../schemas/DailyReport");
const Partner = require("../../schemas/Partner");
const calculateAge = require("../../utils/user/calculateAge");

const updateDailyReport = async (order, user, partnerId) => {
  try {
    const currentDate = new Date().toISOString().split("T")[0];

    // Partner bilgilerini al
    const partner = await Partner.findById(partnerId);

    if (!partner) {
      throw new Error("Partner bulunamadı");
    }

    // Partner bilgilerini kullanarak verileri hesapla
    const age = calculateAge(user.birthDate);
    const male = user.gender === "male" ? 1 : 0;
    const female = user.gender === "female" ? 1 : 0;

    // Yaş aralıklarını hesapla
    const ageGroups = {
      "18-35": age >= 18 && age <= 35 ? 1 : 0,
      "35-100": age > 35 && age <= 100 ? 1 : 0,
    };

    const totalOrders = partner.history.length;
    const totalRevenue = partner.totalRevenue;
    const totalUsers = partner.customers.length;

    // Bugünün raporunu bul veya oluştur
    const todayReport = await DailyReport.findOne({
      date: currentDate,
      partner: partnerId,
    });

    if (!todayReport) {
      const previousReport = await DailyReport.findOne({
        partner: partnerId,
      }).sort({ date: -1 });

      const newReport = new DailyReport({
        partner: partnerId,
        date: currentDate,
        totalUsers: totalUsers,
        totalOrders: totalOrders,
        totalRevenue: totalRevenue,
        differenceUserDaily: totalUsers - (previousReport?.totalUsers || 0),
        differenceOrderDaily: totalOrders - (previousReport?.totalOrders || 0),
        differenceSalesDaily:
          totalRevenue - (previousReport?.totalRevenue || 0),
        gender: {
          male: male,
          female: female,
        },
        age: {
          "18-35": ageGroups["18-35"],
          "35-100": ageGroups["35-100"],
        },
      });

      await newReport.save();

      // Son 30 raporu kontrol et ve gerekirse eskileri sil
      await enforceDailyReportLimit(partnerId);

      return newReport;
    }

    const bestPerformingMembers = await updateBestPerformingMembers(partnerId);
    const bestSellerProducts = await updateBestSellerProducts(partnerId);
    
    // Güncelleme işlemi
    const updatedReport = await DailyReport.findOneAndUpdate(
      { date: currentDate, partner: partnerId },
      {
        $set: {
          totalUsers: totalUsers,
          totalOrders: totalOrders,
          totalRevenue: totalRevenue,
        },
        $inc: {
          differenceUserDaily: totalUsers - todayReport.totalUsers,
          differenceOrderDaily: totalOrders - todayReport.totalOrders,
          differenceSalesDaily: totalRevenue - todayReport.totalRevenue,
          "gender.male": male,
          "gender.female": female,
          "age.18-35": ageGroups["18-35"],
          "age.35-100": ageGroups["35-100"],
        },
      },
      { new: true }
    );

    // Son 30 raporu kontrol et ve gerekirse eskileri sil
    await enforceDailyReportLimit(partnerId);

    return updatedReport;
  } catch (error) {
    console.log(error);
  }
};

const enforceDailyReportLimit = async (partnerId) => {
  const reports = await DailyReport.find({ partner: partnerId })
    .sort({ date: 1 }) // Tarihe göre artan sırada sırala
    .lean();

  if (reports.length > 90) {
    const excessCount = reports.length - 90;

    // Eski raporları sil
    const idsToDelete = reports
      .slice(0, excessCount)
      .map((report) => report._id);
    await DailyReport.deleteMany({ _id: { $in: idsToDelete } });
  }
};
module.exports = updateDailyReport;

const updateBestPerformingMembers = async (partnerId) => {
  // Partner'a bağlı kullanıcıları getir ve performans kriterine göre sırala
  const members = await User.find({ partner: partnerId })
    .sort({ orders: -1 }) // Örneğin, en fazla sipariş veren üyeleri bul
    .limit(5) // İlk 5 kullanıcıyı seç
    .lean();

  return members.map((member) => member._id);
};

const updateBestSellerProducts = async (partnerId) => {
  // Partner'a bağlı ürünleri getir ve satış miktarına göre sırala
  const products = await Product.find({ partner: partnerId })
    .sort({ sales: -1 }) // Örneğin, en çok satan ürünleri bul
    .limit(5) // İlk 5 ürünü seç
    .lean();

  return products.map((product) => product._id);
};
