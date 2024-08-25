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
      require: true,
      unique: true,
    },
    phone: {
      type: String,
      require: true,
      unique: true,
    },
    password: {
      type: String,
      require: true,
    },
    birthdate: {
      type: Date,
      require: true,
    },
    gender: {
      type: String,
      enum: ["woman", "man"],
    },
    category: {
      type: String,
      enum: ["standart", "premium"],
      default: "standart",
    },
    orders: [{ type: Schema.Types.ObjectId, ref: "Order" }], // Reference to Product model
    // favorites:{}
    // history:{}
    // notifications:{}
  },
  { versionKey: false }
);

const User = mongoose.model("User", userSchema);
module.exports = User;
