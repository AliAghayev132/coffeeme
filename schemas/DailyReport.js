const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const DailyReportSchema = new Schema({
  date: {
    type: Date,
    default: Date.now,
    unique: true,
  },
  totalUsers: {
    type: Number,
    default: 0,
  },
  totalOrders: {
    type: Number,
    default: 0,
  },
  totalRevenue: {
    type: Number,
    default: 0,
  },
  differenceUserDaily: {
    type: Number,
    default: 0,
  },
  differenceOrderDaily: {
    type: Number,
    default: 0,
  },
  differenceSalesDaily: {
    type: Number,
    default: 0,
  },
  gender: {
    male: {
      type: Number,
      default: 0,
    },
    female: {
      type: Number,
      default: 0,
    },
  },
  age: {
    ["18-35"]: {
      type: Number,
      default: 0,
    },
    ["35-100"]: {
      type: Number,
      default: 0,
    },
  },
  bestPerformingMembers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  bestSellerProducts: [{ type: Schema.Types.ObjectId, ref: "Product" }],
  partner: { type: Schema.Types.ObjectId, ref: "Partner" },
});

const DailyReport = mongoose.model("DailyReport", DailyReportSchema);
module.exports = DailyReport;

