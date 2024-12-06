const DailyReport = require("../../schemas/DailyReport");
const Partner = require("../../schemas/Partner");

const updateDailyReport = async (order, user, partnerId) => {
  const currentDate = new Date().toISOString().split("T")[0];

  // Partner bilgilerini al
  const partner = await Partner.findById(partnerId);

  if (!partner) {
    throw new Error("Partner bulunamadı");
  }

  // Partner bilgilerini kullanarak verileri hesapla
  const totalOrders = partner.orders.length;
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
      totalUsers: totalUsers, // Partner'den gelen toplam kullanıcı
      totalOrders: totalOrders, // Partner'den gelen toplam sipariş
      totalRevenue: totalRevenue, // Partner'den gelen toplam gelir
      differenceUserDaily: totalUsers - (previousReport?.totalUsers || 0),
      differenceOrderDaily: totalOrders - (previousReport?.totalOrders || 0),
      differenceSalesDaily: totalRevenue - (previousReport?.totalRevenue || 0),
      gender: { male: 0, female: 0 }, // Bu veri ayrıca işlenebilir
      age: { ["18-35"]: 0, ["35-100"]: 0 }, // Bu veri ayrıca işlenebilir
    });

    await newReport.save();

    // Son 30 raporu kontrol et ve gerekirse eskileri sil
    await enforceDailyReportLimit(partnerId);

    return newReport;
  }

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
      },
    },
    { new: true }
  );

  // Son 30 raporu kontrol et ve gerekirse eskileri sil
  await enforceDailyReportLimit(partnerId);

  return updatedReport;
};

/**
 * Son 30 raporu korur, eski raporları siler.
 */
const enforceDailyReportLimit = async (partnerId) => {
  const reports = await DailyReport.find({ partner: partnerId })
    .sort({ date: 1 }) // Tarihe göre artan sırada sırala
    .lean();

  if (reports.length > 30) {
    const excessCount = reports.length - 30;

    // Eski raporları sil
    const idsToDelete = reports
      .slice(0, excessCount)
      .map((report) => report._id);
    await DailyReport.deleteMany({ _id: { $in: idsToDelete } });
  }
};

module.exports = updateDailyReport;
