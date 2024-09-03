const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const productSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    required: false,
  },
  discountedPrice: {
    type: Number,
    required: false,
  },
  category: {
    type: String,
    required: true,
    enum: ["cookie", "drink"],
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
  console.log("hey");
  if (this.isModified("price") || this.isModified("discount")) {
    console.log("Bura","hello");
    if (this.discount && this.discount > 0) {
      this.discountedPrice = this.price - (this.price * this.discount) / 100;
      console.log(this.discountedPrice,this.discount,this.price);
    } else {
      this.discountedPrice = this.price;
    }
  }
  next();
});
const Product = mongoose.model("Product", productSchema);
module.exports = Product;
