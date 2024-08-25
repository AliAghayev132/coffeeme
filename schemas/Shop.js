const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const PartnerShop = require("./PartnerShop");

const shopSchema = new Schema({
  address: {
    type: String,
    required: true,
    unique: true,
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
});

shopSchema.pre("save", async function (doc) {
  if (this.isNew) {
    console.log("Hey");
    try {
      console.log("Creating PartnerShop for new Shop...");

      const newPartnerShop = new PartnerShop({
        shop: doc._id,
        orders: [], // Initialize empty orders array
        totalRevenue: 0,
        totalOrders: 0,
      });

      await newPartnerShop.save();
      console.log("PartnerShop created for new Shop.");
    } catch (error) {
      console.error("Error creating PartnerShop:", error);
    }
  }
});

shopSchema.index({ location: "2dsphere" });
const Shop = mongoose.model("Shop", shopSchema);
module.exports = Shop;
