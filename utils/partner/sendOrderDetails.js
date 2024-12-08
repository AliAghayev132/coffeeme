async function sendOrderDetails(email, data) {
  try {
    const mailResponse = await mailSender(
      email,
      "Sifariş mk",
      `<h1>
          ${data.totalPrice} 
          ${data.totalDiscountedPrice}
        </h1>`
    );
  } catch (error) {
    console.log("Error occurred while sending email: ", error);
    throw error;
  }
}

module.exports = sendOrderDetails;
