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

const additionSchema = new Schema({
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
    default: 0,
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
  rating: {
    type: Number,
    required: false,
    default: 5,
  },
  ratingCount: {
    type: Number,
    default: 0,
  },
  stock: {
    type: Boolean,
    default: true,
  },
  additions: {
    extras: [additionSchema], // Ekstralar
    syrups: [additionSchema], // Şuruplar
  },
  // stock: {
  //   type: Boolean,
  //   default: true,
  // },
});

productSchema.pre("save", function (next) {
  this.sizes = this.sizes.map((size) => {
    size.discountedPrice = calculateDiscountedPrice(size.price, size.discount);
    return size;
  });

  // Process additions (extras and syrups)
  this.additions.extras = this.additions.extras.map((extra) => {
    extra.discountedPrice = calculateDiscountedPrice(
      extra.price,
      extra.discount
    );
    return extra;
  });

  this.additions.syrups = this.additions.syrups.map((syrup) => {
    syrup.discountedPrice = calculateDiscountedPrice(
      syrup.price,
      syrup.discount
    );
    return syrup;
  });

  next();
});

function calculateDiscountedPrice(price, discount) {
  let discountedPrice = price;

  if (discount && discount > 0) {
    discountedPrice = price - (price * discount) / 100;
  }

  return customRound(discountedPrice);
}

// Custom rounding function
function customRound(value) {
  const rounded = Math.round(value * 100) / 100;
  const decimalPart = rounded - Math.floor(rounded);

  if (decimalPart >= 0.06) {
    return Math.ceil(rounded * 100) / 100;
  } else {
    return Math.floor(rounded * 100) / 100;
  }
}

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
