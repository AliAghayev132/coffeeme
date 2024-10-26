const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PartnerSchema = new Schema({
  isOnline: {
    type: Boolean,
    default: false,
  },
  fullname: {
    type: String,
    required: false,
  },
  username: {
    type: String,
    required: false,
    unique: true,
    default: function () {
      return `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    },
  },
  password: {
    type: String,
    required: false,
  },
  shop: {
    type: Schema.Types.ObjectId,
    ref: "Shop",
    required: true,
  },
  orders: [{ type: Schema.Types.ObjectId, ref: "Order" }],
  totalRevenue: {
    type: Number,
    default: 0,
  },
  phone: {
    type: String,
    required: false,
    unique: false,
  },
  role: {
    type: String,
    default: "partner",
  },
  shopPercentage: {
    type: Number,
    required: true,
    default: 25,
  },
  history: [{ type: Schema.Types.ObjectId, ref: "Order" }],
  balance: {
    type: Number,
    default: 0,
  },
  followers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  closeUsers: [
    {
      userId: { type: Schema.Types.ObjectId, ref: "User" },
      lastLocationUpdate: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  notifications: [
    {
      type: Schema.Types.ObjectId,
      ref: "Notification",
    },
  ],
});

const Partner = mongoose.model("Partner", PartnerSchema);

module.exports = Partner;
