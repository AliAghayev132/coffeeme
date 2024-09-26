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
  discountedPrice: {
    type: Number,
    required: false,
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
    default: "none",
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
  rayting: {
    type: Number,
    default: 5,
  },
  stock: {
    type: Boolean,
    default: true,
  },
});
productSchema.pre("save", function (next) {
  this.sizes = this.sizes.map((size) => {
    if (size.discount && size.discount > 0) {
      // İndirimli fiyatı hesapla
      size.discountedPrice = size.price - (size.price * size.discount) / 100;
    } else {
      size.discountedPrice = size.price;
    }

    // Özel yuvarlama fonksiyonunu kullan
    size.discountedPrice = customRound(size.discountedPrice);
    size.price = customRound(size.price); // Ana fiyatı da yuvarla

    return size;
  });

  next();
});

const Product = mongoose.model("Product", productSchema);
module.exports = Product;

function customRound(value) {
  const rounded = Math.round(value * 100) / 100;

  const decimalPart = rounded - Math.floor(rounded); // Ondalık kısmı al

  if (decimalPart >= 0.06) {
    return Math.ceil(rounded * 100) / 100;
  } else {
    return Math.floor(rounded * 100) / 100;
  }
}
