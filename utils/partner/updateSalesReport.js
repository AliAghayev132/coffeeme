const DailyReport = require("../../schemas/DailyReport");
const Partner = require("../../schemas/Partner");

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

module.exports = updateDailyReport;
