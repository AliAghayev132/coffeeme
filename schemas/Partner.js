// Partner.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PartnerSchema = new Schema({
  username: {
    type: String,
    required: false,
    unique: true,
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
  username: {
    type: String,
    required: false,
  },
  phone: {
    type: String,
    require: false,
    unique: true,
  },
});

const Partner = mongoose.model("Partner", PartnerSchema);
module.exports = Partner;
