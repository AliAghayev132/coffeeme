const User = require("../../schemas/User");
const Partner = require("../../schemas/Partner");
const Product = require("../../schemas/Product");
const DailyReport = require("../../schemas/DailyReport");
const calculateAge = require("../../utils/user/calculateAge");

const updateBestPerformingMembers = async (partnerId) => {
  const partner = await Partner.findById(partnerId)
    .select("customers")
    .populate("customers.user", "_id")
    .lean();

  if (!partner || !partner.customers) {
    return [];
  }

  const topCustomers = partner.customers
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return topCustomers.map((customer) => customer.user._id);
};

const updateBestSellerProducts = async (partnerId) => {
  const partner = await Partner.findById(partnerId)
    .populate({
      path: "shop",
      select: "products",
      populate: {
        path: "products",
        select: "sales",
      },
    })
    .lean();

  if (
    !partner ||
    !partner.shop.products ||
    partner.shop.products.length === 0
  ) {
    return [];
  }

  const bestSellerProducts = partner.shop.products
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5)
    .map((product) => product._id);

  return bestSellerProducts;
};

const calculateCustomerStats = async (partnerId) => {
  const partner = await Partner.findById(partnerId)
    .populate({
      path: "customers.user",
      select: "birthDate gender -_id",
    })
    .select("customers");

  // Müşteri bilgilerini işleyin
  let ageGroups = {
    "18-35": 0,
    "35-100": 0,
  };
  let genderCounts = {
    male: 0,
    female: 0,
  };

  partner.customers.forEach((customer) => {
    const age = calculateAge(customer.user.birthDate);
    const gender = customer.user.gender;

    // Cinsiyeti değerlendir
    if (gender === "male") {
      genderCounts.male += 1;
    } else if (gender === "female") {
      genderCounts.female += 1;
    }

    // Yaş aralıklarını değerlendir
    if (age >= 18 && age <= 35) {
      ageGroups["18-35"] += 1;
    } else if (age > 35 && age <= 100) {
      ageGroups["35-100"] += 1;
    }
  });

  return { ageGroups, genderCounts };
};

const updateDailyReport = async (user, partnerId) => {
  try {
    const currentDate = new Date().toISOString().split("T")[0];

    const partner = await Partner.findById(partnerId);

    if (!partner) {
      throw new Error("Partner bulunamadı");
    }

    const customersStats = await calculateCustomerStats(partnerId);
    const todayReport = await DailyReport.findOne({
      date: currentDate,
      partner: partnerId,
    });

    const totalUsers = partner.customers.length;
    console.log({totalUsers});
    
    const totalOrders = partner.history.length;
    const totalRevenue = partner.totalRevenue;
    const bestPerformingMembers = await updateBestPerformingMembers(partnerId);
    const bestSellerProducts = await updateBestSellerProducts(partnerId);
    const previousReport = await DailyReport.findOne({
      partner: partnerId,
      date: { $lt: currentDate },
    }).sort({ date: -1 });

    if (!todayReport) {
      const newReport = new DailyReport({
        partner: partnerId,
        date: currentDate,
        totalUsers: totalUsers,
        totalOrders: totalOrders,
        totalRevenue: totalRevenue,
        bestPerformingMembers,
        bestSellerProducts,
        differenceUserDaily: totalUsers - (previousReport?.totalUsers || 0),
        differenceOrderDaily: totalOrders - (previousReport?.totalOrders || 0),
        differenceSalesDaily:
          totalRevenue - (previousReport?.totalRevenue || 0),
        gender: {
          male: customersStats.genderCounts.male,
          female: customersStats.genderCounts.female,
        },
        age: {
          "18-35": customersStats.ageGroups["18-35"],
          "35-100": customersStats.ageGroups["35-100"],
        },
      });

      await newReport.save();
      partner.dailyReports.push(newReport);
      await partner.save();

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
          bestPerformingMembers,
          bestSellerProducts,
          "gender.male": customersStats.genderCounts.male,
          "gender.female": customersStats.genderCounts.female,
          "age.18-35": customersStats.ageGroups["18-35"],
          "age.35-100": customersStats.ageGroups["35-100"],
          differenceUserDaily: totalUsers - (previousReport?.totalUsers || 0),
          differenceOrderDaily:
            totalOrders - (previousReport?.totalOrders || 0),
          differenceSalesDaily:
            totalRevenue - (previousReport?.totalRevenue || 0),
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
    .sort({ date: 1 }) // Sort by date ascending
    .lean();

  if (reports.length > 90) {
    const excessCount = reports.length - 90;

    // Get IDs of old reports
    const idsToDeleteFromReports = reports
      .slice(0, excessCount)
      .map((report) => report._id);

    // Delete old reports from DailyReport collection
    await DailyReport.deleteMany({ _id: { $in: idsToDeleteFromReports } });

    // Delete old reports from the partner's dailyReports array
    const partner = await Partner.findById(partnerId);
    partner.dailyReports = partner.dailyReports.filter(
      (reportId) => !idsToDeleteFromReports.includes(reportId.toString())
    );

    await partner.save();
  }
};

module.exports = updateDailyReport;
