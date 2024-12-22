const fs = require("fs");
const path = require("path");
const { Parser } = require("json2csv");
const Partner = require("../../schemas/Partner");
const mailSender = require("../../utils/mailsender");

const exportHistoryCsv = async (req, res) => {
  try {
    const { username } = req.user;
    const partner = await Partner.findOne({ username }).populate({
      path: "history",
      populate: [
        {
          path: "user",
          select: "firstname secondname",
        },
        {
          path: "items.product",
          select: "name category price rating",
        },
      ],
    });

    if (partner.timers.csv.tryCount === 3) {
      const currentTime = Date.now();

      const csvTime = partner.timers.csv.date.getTime();

      const thirtyMinutesInMillis = 30 * 60 * 1000;

      const timePassed = currentTime - csvTime > thirtyMinutesInMillis;

      if (timePassed) partner.timers.csv.tryCount = 0;
      else return res.status(400).json({ message: "You try 3 times just wait amk", success: false });
    }

    ++partner.timers.csv.tryCount;
    partner.timers.csv.date = new Date();

    await partner.save();

    const data = partner.history.map((order) => {
      return {
        OrderID: order._id,
        User: `${order.user.firstname} ${order.user.secondname}`,
        Product: order.items.map((item) => item.product.name).join(", "),
        Category: order.items.map((item) => item.product.category).join(", "),
        Price: order.totalPrice,
        Rating: order.items.map((item) => item.product.rating).join(", "),
        Date: order.statusHistory[0].changedAt,
      };
    });
    const fields = Object.keys(data[0]);
    const opts = {
      fields,
      headerAlign: "left", // Align header to the left
      align: "left",
    };
    const parser = new Parser(opts);
    const csv = parser.parse(data);
    const dirPath = path.join(__dirname, "public/temp");
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    const filePath = path.join(dirPath, `${username}_history.csv`);
    fs.writeFileSync(filePath, csv);
    const email = partner.email;
    const emailSubject = "Your Order History";
    const emailBody = "<h1>Order History Details</h1>";
    const attachments = [
      {
        filename: `${username}_history.csv`,
        path: filePath,
        contentType: "text/csv",
      },
    ];

    // Send email with the CSV attachment
    await mailSender(email, emailSubject, emailBody, attachments);

    // Clean up - delete the file after sending
    fs.unlinkSync(filePath);

    res.status(200).json({ success: true, message: "Email sent successfully!" });
  } catch (error) {
    console.log(error);

    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { exportHistoryCsv };
