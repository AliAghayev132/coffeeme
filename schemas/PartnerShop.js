// partnerShop.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Shop = require("./Shop"); // Import the Shop model

const PartnerShopSchema = new Schema({
  shop: {
    type: Schema.Types.ObjectId,
    ref: "Shop",
    required: true
  },
  orders: [{ type: Schema.Types.ObjectId, ref: "Order" }],
  totalRevenue: {
    type: Number,
    default: 0
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  createdDate: {
    type: Date,
    default: Date.now
  },
  modifiedDate: {
    type: Date,
    default: Date.now
  }
});

const PartnerShop = mongoose.model("PartnerShop", PartnerShopSchema);
module.exports = PartnerShop;
