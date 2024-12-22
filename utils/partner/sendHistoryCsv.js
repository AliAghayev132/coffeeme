const mailSender = require("../../utils/mailsender");
const path = require("path");

async function sendOrderDetails(email, data, filePath) {
  try {
    // Define attachments array (if there's a file to attach)
    let attachments = [];
    if (filePath) {
      attachments.push({
        filename: path.basename(filePath),
        path: filePath, // Path to the file you want to attach
        contentType: "application/pdf", // Use appropriate MIME type
      });
    }

    const mailResponse = await mailSender(email, "Sifariş mk", `<h1>${data.totalPrice} ${data.totalDiscountedPrice}</h1>`, attachments);

    return mailResponse;
  } catch (error) {
    console.log("Error occurred while sending email: ", error);
    throw error;
  }
}

module.exports = sendOrderDetails;
