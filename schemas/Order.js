const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  discount: { type: Number, required: false },
  discountedPrice: { type: Number, required: false },
  size: { type: String, require: true },
});

const statusHistorySchema = new Schema({
  status: {
    type: String,
    enum: ["pending", "preparing", "finished", "delivered", "cancelled"],
    required: true,
  },
  changedAt: {
    type: Date,
    default: Date.now,
  }
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
    required: false,
  },
  totalDiscountedPrice: {
    type: Number,
    required: false,
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
  finishedDate: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: ["pending", "preparing", "finished", "delivered", "cancelled"],
    default: "Pending",
  },
  statusHistory: [statusHistorySchema], // Track status changes
});

orderSchema.pre('save', function (next) {
  const order = this;
  if (order.isModified('status')) {
    order.statusHistory.push({
      status: order.status,
      changedAt: new Date(),
    });

    if (order.status === 'completed') {
      order.finishedDate = new Date();
    }
  }

  next();
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
