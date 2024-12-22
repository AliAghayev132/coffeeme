const Partner = require("../../schemas/Partner");
const Product = require("../../schemas/Product");

// GetSales
const getFullReport = async (req, res) => {
  try {
    const { username } = req.user;
    const partner = await Partner.findOne({ username })
      .populate({
        path: "dailyReports",
        options: { sort: { createdAt: -1 }, limit: 1 },
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
            const updatedProduct = await Product.findById(product._id).select("sales");
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

    if (!partner) return res.status(404).json({ success: false, message: "Partner not found" });

    const todayReport = partner.dailyReports?.[0];

    res.status(200).json({ success: true, todayReport: todayReport });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const getReportBetweenDays = async (req, res) => {
  try {
    const { username } = req.user;
    const { days = 7 } = req.query;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const partner = await Partner.findOne({ username })
      .populate({
        path: "dailyReports",
        match: {
          createdAt: { $gte: startDate, $lte: endDate }, // Belirtilen aralıkta raporları getir
        },
        options: { sort: { createdAt: -1 } }, // Yeni tarihler önce
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

    console.log(partner.dailyReports);

    if (!partner || !partner.dailyReports || partner.dailyReports.length === 0) {
      return res.status(404).json({ success: false, message: "No reports found in the specified range." });
    }

    const allReports = partner.dailyReports;
    const resultReports = [];
    for (let i = 0; i < days; i++) {
      const targetDate = new Date();
      targetDate.setDate(endDate.getDate() - i);

      const report = allReports.find((r) => new Date(r.createdAt).toDateString() === targetDate.toDateString());

      if (report) {
        resultReports.push(report);
      }
    }

    let results = await Promise.all(
      resultReports.map(async (dailyReport) => {
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
            const updatedProduct = await Product.findById(product._id).select("sales");
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
    results = results.reverse();
    const firstDay = results[0];
    const lastDay = results.at(-1);

    const genders = {};
    const ages = {};
    const bestPerformingMembers = [];
    const bestSellerProducts = [];

    for (let i = 0; i < firstDay.bestPerformingMembers.length; ++i) {
      if (!bestPerformingMembers.find((member) => member._id === firstDay.bestPerformingMembers[i]._id)) {
        bestPerformingMembers.push(firstDay.bestPerformingMembers[i]);
      }
    }

    for (let i = 0; i < firstDay.bestSellerProducts.length; ++i) {
      if (!bestSellerProducts.find((member) => member._id === firstDay.bestSellerProducts[i]._id)) {
        bestSellerProducts.push(firstDay.bestSellerProducts[i]);
      }
    }

    for (let i = 0; i < lastDay.bestPerformingMembers.length; ++i) {
      if (!bestPerformingMembers.find((member) => member._id === lastDay.bestPerformingMembers[i]._id)) {
        bestPerformingMembers.push(lastDay.bestPerformingMembers[i]);
      }
    }

    for (let i = 0; i < lastDay.bestSellerProducts.length; ++i) {
      if (!bestSellerProducts.find((member) => member._id === lastDay.bestSellerProducts[i]._id)) {
        bestSellerProducts.push(lastDay.bestSellerProducts[i]);
      }
    }

    for (let i in firstDay.gender) {
      genders[i] = lastDay.gender[i] - firstDay.gender[i];
    }
    for (let i in firstDay.age) {
      ages[i] = lastDay.age[i] - firstDay.age[i];
    }

    const resultDay = {
      totalUsers: lastDay.totalUsers - firstDay.totalUsers,
      totalOrders: lastDay.totalOrders - firstDay.totalOrders,
      totalRevenue: lastDay.totalRevenue - firstDay.totalRevenue,
      differenceUserDaily: ((lastDay.totalUsers - firstDay.totalUsers) / firstDay.totalUsers) * 100,
      differenceOrderDaily: ((lastDay.totalOrders - firstDay.totalOrders) / firstDay.totalUsers) * 100,
      differenceSalesDaily: ((lastDay.totalRevenue - firstDay.totalRevenue) / firstDay.totalUsers) * 100,
      bestSellerProducts: bestSellerProducts.sort((a, b) => b.count - a.count).slice(0, 5),
      bestPerformingMembers: bestPerformingMembers.sort((a, b) => b.count - a.count).slice(0, 5),
      gender: genders,
      age: ages,
    };

    res.status(200).json({ success: true, resultDay: resultDay });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { getFullReport, getReportBetweenDays };
