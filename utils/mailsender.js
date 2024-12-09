const nodemailer = require('nodemailer');

const mailSender = async (email, title, body) => {
  try {
    // Create a Transporter to send emails
    let transporter = nodemailer.createTransport({
      service:"",
      host: process.env.MAIL_HOST,
      port: 587, // or 587 if not using SSL
      secure: false, // true for 465, false for other ports like 587
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
    // Send emails to users
    let info = await transporter.sendMail({
      from: `CoffeeMe ${process.env.MAIL_USER}`,
      to: email,
      subject: title,
      html: body,
    });
    return info;
  } catch (error) {
  }
};
module.exports = mailSender;