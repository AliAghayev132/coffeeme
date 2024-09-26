const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    firstname: {
      type: String,
      default: null,
    },
    secondname: {
      type: String,
      default: null,
    },
    image: {
      type: String,
      default: null,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    birthdate: {
      type: Date,
      required: true,
      default: Date.now(),
    },
    gender: {
      type: String,
      enum: ["woman", "man"],
    },
    category: {
      type: String,
      enum: ["standard", "premium"],
      default: "standard",
    },
    role: {
      type: String,
      default: "user",
    },
    balance: {
      type: Number,
      default: 1000,
    },
    loyalty: {
      type: Number,
      default: 0,
    },
    favorites: {
      shops: [{ type: Schema.Types.ObjectId, ref: "Shop" }],
      products: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    },
    follows: [{ type: Schema.Types.ObjectId, ref: "Shop" }],
    orders: [{ type: Schema.Types.ObjectId, ref: "Order" }], // Active orders
    history: [{ type: Schema.Types.ObjectId, ref: "Order" }], // Canceled/Finished orders
    streak: {
      count: {
        type: Number,
        default: 0,
      },
      lastOrderDate: {
        type: Date,
      },
    },
    fingerTips: {
      type: {
        coffees: {
          type: [String],
          default: [],
        },
        desserts: {
          type: [String],
          default: [],
        },
        coffeeshops: {
          type: [String],
          default: [],
        },
      },
      default: null, // Default to null
    },
  },
  { versionKey: false }
);

const User = mongoose.model("User", userSchema);
module.exports = User;
