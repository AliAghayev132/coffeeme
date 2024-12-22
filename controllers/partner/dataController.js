const fs = require("fs");
const path = require("path");
const { Parser } = require("json2csv");
const Partner = require("../../schemas/Partner");
const Order = require("../../schemas/Order");
const mailSender = require("../../utils/mailsender");
const calculateAge = require("../../utils/user/calculateAge");

const exportDataCsv = async (req, res) => {
  try {
    const { username } = req.user;

    const partner = await Partner.findOne({ username }).populate({
      path: "customers.user",
      select: "firstname secondname gender birthDate extraDetails orders",
      populate: [
        {
          path: "extraDetails.mostOrderedThreeProducts",
          select: "name",
        },
        {
          path: "extraDetails.mostGoingCoffeeShop",
          select: "name",
        },
        {
          path: "extraDetails.overAllRating",
          select: "rating",
        },
      ],
    });

    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner not found" });
    }

    // Fetch customer details along with lastOrder and lastRatedOrder
    const updatedCustomers = await Promise.all(
      partner.customers.map(async (customer) => {
        const lastOrderPromise = Order.findOne({ user: customer.user._id }).sort({ _id: -1 }).populate("items.product", "name price");

        const lastRatedOrderPromise = Order.findOne({
          user: customer.user._id,
          "rating.product": { $ne: null },
        })
          .sort({ _id: -1 })
          .populate("items.product", "name price");

        const [lastOrder, lastRatedOrder] = await Promise.all([lastOrderPromise, lastRatedOrderPromise]);

        return {
          firstname: customer.user.firstname,
          secondname: customer.user.secondname,
          gender: customer.user.gender,
          age: calculateAge(customer.user.birthDate),
          overAllRating: customer.user.extraDetails?.overAllRating,
          mostOrderedProducts: customer.user.extraDetails?.mostOrderedThreeProducts?.map((p) => p.name).join(", "),
          mostVisitedCoffeeShop: customer.user.extraDetails?.mostGoingCoffeeShop?.name || "N/A",
          lastOrder: lastOrder ? lastOrder.items.map((item) => `${item.product.name}`).join(", ") : "No orders",
          lastRatedOrder: lastRatedOrder ? lastRatedOrder?.rating?.product : "No ratings",
        };
      })
    );

    // Convert customer data to CSV
    const fields = Object.keys(updatedCustomers[0]);
    const parser = new Parser({ fields });
    const csv = parser.parse(updatedCustomers);

    // Save CSV to a temporary file
    const dirPath = path.join(__dirname, "public/temp");
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const filePath = path.join(dirPath, `${username}_customers.csv`);
    fs.writeFileSync(filePath, csv);

    // Send the CSV via email
    const email = partner.email;
    const emailSubject = "Customer Data Export";
    const emailBody = "<h1>Customer Data</h1>";
    const attachments = [
      {
        filename: `${username}_customers.csv`,
        path: filePath,
        contentType: "text/csv",
      },
    ];

    await mailSender(email, emailSubject, emailBody, attachments);

    // Delete the temporary file
    fs.unlinkSync(filePath);

    res.status(200).json({ success: true, message: "Customer data CSV sent successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = { exportDataCsv };
