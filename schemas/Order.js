const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  discount: { type: Number, required: false },
});

const orderSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  items: [orderItemSchema],
  shop: {
    type: Schema.Types.ObjectId,
    ref: "Shop",
    required: true,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  message: {
    type: String,
    required: false,
    default: null,
  },
  createdDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["Pending", "Processing", "Completed", "Cancelled"],
    default: "Pending",
  },
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
