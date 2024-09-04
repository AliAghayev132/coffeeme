const mongoose = require("mongoose");
const mailSender = require("../utils/mailsender");
const Schema = mongoose.Schema;

const otpSchema = new Schema({
  email: {
    type: String,
    require: true,
    index: true,
  },
  phone: {
    type: String,
    require: true,
    index: true,
  },
  otp: {
    type: String,
    require: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: "2m",
  },

});

async function sendVerificationEmail(email, otp) {
  try {
    const mailResponse = await mailSender(
      email,
      "Verification Email",
      `<h1>Please confirm your OTP</h1>
          <p>Here is your OTP code: ${otp}</p>`
    );
  } catch (error) {
    console.log("Error occurred while sending email: ", error);
    throw error;
  }
}

otpSchema.pre("save", async function (next) {
  if (this.isNew) {
    setImmediate(async () => {
      try {
        await sendVerificationEmail(this.email, this.otp);
      } catch (error) {
        console.log("Error occurred while sending email: ", error);
      }
    });
  }
  next();
});

const Otp = mongoose.model("Otp", otpSchema);
module.exports = Otp;
