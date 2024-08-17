const Otp =  require("../schemas/Otp");
const otpGenerator = require("otp-generator");

const generateUniqueOtp = async () => {
  let otp = otpGenerator.generate(4, {
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false,
  });   

  while (await Otp.findOne({ otp })) {
    otp = otpGenerator.generate(4, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });
  }

  return otp;
};

module.exports = generateUniqueOtp;