const mongoose = require("mongoose");
const Product = require("./Product");
const Schema = mongoose.Schema;

const shopSchema = new Schema({
  address:{
    type:String,
    required:true,
  },
  name: {
    type: String,
    required: true,
  },
  logo: {
    type: String,
    default: null,
  },
  photo: {
    type: String,
    default: null,
  },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  products: [{ type: Schema.Types.ObjectId, ref: "Product" }], // Reference to Product model
});

shopSchema.index({ location: "2dsphere" });
const Shop = mongoose.model("Shop", shopSchema);
module.exports = Shop;
