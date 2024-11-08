const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const referralSchema = new Schema({
  referredUserId: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  referrerUserId: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  rewardGiven: {
    type: Boolean,
    default: false,
  },
});

const Referral = mongoose.model("Referral", referralSchema);
module.exports = Referral;
