const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const productSchema = {
  title: {
    type: String,
    required: true,
  },
  photo: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ["drink,dessert"],
  },
};

const fingerTipsSchema = new Schema({
  products: [productSchema],
  coffeeShops: [{ type: Schema.Types.ObjectId, ref: "Shop" }],
});

const FingerTips = mongoose.model("FingerTips", fingerTipsSchema);
module.exports = FingerTips;
