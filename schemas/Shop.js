const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const PartnerShop = require("./Partner");

const shopSchema = new Schema({
  isOnline: {
    type: Boolean,
    default: false,
  },
  address: {
    type: String,
    required: true,
  },
  shortAddress: {
    type: String,
    default: "",
  },
  name: {
    type: String,
    required: true,
  },
  logo: {
    type: String,
    default: null,
    required: false,
  },
  photo: {
    type: String,
    default: null,
    required: false,
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
  rating: {
    type: Number,
    required: false,
    default: 5,
  },
  ratingCount: {
    type: Number,
    default: 0,
  },
  openHours: {
    open: {
      type: String,
      default: "10",
    },
    close: {
      type: String,
      default: "20",
    },
  },
  discountPercentage: {
    type: Number,
    required: true,
    default: 10,
  },
});

shopSchema.pre("save", async function (next) {
  if (this.isNew) {
    try {
      const newPartnerShop = new PartnerShop({
        shop: this._id, // Ensure this._id is properly set
        orders: [], // Initialize empty orders array
        totalRevenue: 0,
        totalOrders: 0,
      });

      await newPartnerShop.save();
      console.log("PartnerShop created for new Shop.");
    } catch (error) {
      console.error("Error creating PartnerShop:", error);
      return next(error);
    }
  }
  next();
});

shopSchema.index({ location: "2dsphere" });
const Shop = mongoose.model("Shop", shopSchema);
module.exports = Shop;
