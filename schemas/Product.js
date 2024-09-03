const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const sizeSchema = new Schema({
  size: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    required: true,
  },
});

const productSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  sizes: [sizeSchema],
  category: {
    type: String,
    required: true,
    enum: ["dessert", "drink", "other"],
  },
  type: {
    type: String,
    required: true,
    enum: ["none", "takeaway", "cup", "all"],
  },
  shop: {
    id: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    logo: {
      type: String,
      required: true,
    },
  },
  description: {
    type: String,
    required: false,
  },
  createdDate: {
    type: Date,
    default: Date.now,
  },
  modifiedDate: {
    type: Date,
    default: Date.now,
  },
  photo: {
    type: String,
    required: false,
  },
  discountType: {
    type: String,
    enum: ["STANDARD_DISCOUNT", "SPECIAL_DISCOUNT"],
    required: true,
  },
});

productSchema.pre("save", function (next) {
  this.sizes.forEach((size) => {
    if (size.isModified("price") || size.isModified("discount")) {
      if (size.discount && size.discount > 0) {
        size.discountedPrice = size.price - (size.price * size.discount) / 100;
      } else {
        size.discountedPrice = size.price;
      }
    }
  });

  next();
});

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
