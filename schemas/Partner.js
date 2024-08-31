// Partner.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PartnerSchema = new Schema({
  username: {
    type: String,
    required: false,
    unique: false,
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
});

const Partner = mongoose.model("Partner", PartnerSchema);
module.exports = Partner;
