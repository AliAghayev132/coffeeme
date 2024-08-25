const mongoose = require("mongoose");
const Schema = mongoose.Schema;

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

console.log("Salam");
shopSchema.post("save", async function (doc) {
  console.log(doc.isNew);
  if (doc.isNew) {
    try {
      console.log("Hey");
      
      const PartnerShop = mongoose.model("PartnerShop");

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
