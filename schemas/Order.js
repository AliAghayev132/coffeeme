const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const additionItemSchema = new Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  discount: { type: Number, required: false },
  discountedPrice: { type: Number, required: false },
});

const orderItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  discount: { type: Number, required: false },
  type: {
    type: String,
    required: true,
    enum: ["none", "takeaway", "cup", "all"],
  },
  discountedPrice: { type: Number, required: false },
  size: { type: String, required: true },
  additions: {
    extras: [additionItemSchema],
    syrups: [additionItemSchema],
  },
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
  },
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
  preparingTime: {
    type: Number,
  },
  status: {
    type: String,
    enum: ["pending", "preparing", "finished", "delivered", "cancelled"],
  },
  statusHistory: [statusHistorySchema],
  rating: {
    product: {
      type: Number,
      default: null,
    },
    shop: {
      type: Number,
      default: null,
    },
  },
  category: {
    type: String,
    enum: ["standard", "premium", "streakPremium"],
    default: "standard",
  },
  loyalty: {
    type: Boolean,
    default: false,
  },
  id: {
    type: Number,
    default: 0,
    required: true,
  },
});
orderSchema.pre("save", async function (next) {
  const order = this;

  if (order.isNew) {
    const lastOrder = await mongoose.model("Order").findOne().sort({ id: -1 }); // Find the last inserted order by descending id
    console.log(lastOrder);
    order.id = lastOrder ? lastOrder.id + 1 : 1; // Increment `id` or start at 1
    console.log(order.id, lastOrder.id);
  }

  if (order.isModified("status")) {
    order.statusHistory.push({
      status: order.status,
      changedAt: new Date(),
    });
  }

  next();
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
