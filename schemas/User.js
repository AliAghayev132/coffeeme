const mongoose = require("mongoose");
const { getAzerbaijanTime } = require("../utils/date/dateUtils");
const Schema = mongoose.Schema;

const balanceActivitySchema = new Schema({
  category: {
    type: String,
    enum: ["refund", "topUp", "refer", "order", "gift", "coupon"],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now(),
  },
  amount: {
    type: Number,
    required: true,
  },
});



const userSchema = new Schema(
  {
    online: {
      is: {
        type: Boolean,
        default: false,
      },
      lastTimeDate: {
        type: Date,
        default: null,
      }
    },
    firstname: {
      type: String,
      default: null,
      required: true
    },
    secondname: {
      type: String,
      default: null,
      required: true
    },
    image: {
      type: String,
      default: null
    },
    email: {
      type: String,
      required: true,
      unique: true
    },
    phone: {
      type: String,
      required: true,
      unique: true
    },
    password: {
      type: String,
      required: true
    },
    birthDate: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      enum: ["female", "male"],
      required: true
    },
    category: {
      type: String,
      enum: ["standard", "premium", "streakPremium"],
      default: "standard",
    },
    categoryModifiedAt: { type: Date }, // Track when category was last modified
    role: { type: String, default: "user" },
    balance: { type: Number, default: 1000 },
    loyalty: { type: Number, default: 0 },
    favorites: {
      shops: [{ type: Schema.Types.ObjectId, ref: "Shop" }],
      products: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    },
    follows: [{ type: Schema.Types.ObjectId, ref: "Shop" }],
    orders: [{ type: Schema.Types.ObjectId, ref: "Order" }], // Active orders
    history: [{ type: Schema.Types.ObjectId, ref: "Order" }], // Canceled/Finished orders
    streak: {
      count: { type: Number, default: 0 },
      lastOrderDate: { type: Date, default: Date.now() },
    },
    fingerTips: {
      type: {
        coffees: { type: [String], default: [] },
        desserts: { type: [String], default: [] },
        coffeeshops: { type: [String], default: [] },
      },
      default: null, // Default to null
    },
    recentSearched: {
      shops: [
        {
          item: { type: Schema.Types.ObjectId, ref: "Shop", required: true },
        },
      ],
      products: [
        {
          item: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        },
      ],
    },
    lastLocationUpdate: {
      date: {
        type: Date,
        default: Date.now,
      },
      location: {
        latitude: { type: Number },
        longitude: { type: Number },
      },
    },
    extraDetails: {
      mostGoingCoffeeShop: { type: Schema.Types.ObjectId, ref: "Shop" },
      mostOrderedThreeProducts: [
        { type: Schema.Types.ObjectId, ref: "Product" },
      ],
      overAllRating: {
        rating: {
          type: Number,
          default: 0,
        },
        count: {
          type: Number,
          default: 0,
        },
      },
      referralCode: {
        type: String,
      },
      referredBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
    visitedCoffeeShops: [
      {
        shopId: {
          type: Schema.Types.ObjectId,
          ref: "Shop",
        },
        count: {
          type: Number,
          default: 1,
        },
      },
    ],
    orderedProducts: [
      {
        orderId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
        },
        count: {
          type: Number,
          default: 1,
        },
      },
    ],
    notifications: [{ type: Schema.Types.ObjectId, ref: "Notification" }],
    balanceActivities: [balanceActivitySchema],
    accountStatus: {
      status: {
        type: String,
        enum: ["active", "deleted", "blocked"],
        default: "active"
      },
      createdAt: {
        type: Date,
        default: getAzerbaijanTime
      }
    }
  },

  { versionKey: false }
);

userSchema.index({ "extraDetails.referralCode": 1 }, { unique: true });

// Pre-save middleware to track category changes and ensure uniqueness
userSchema.pre("save", function (next) {
  if (this.isModified("category")) {
    this.categoryModifiedAt = new Date(); // Update timestamp when category is changed
  }

  // Normalize visitedCoffeeShops to ensure unique shopId
  const uniqueVisitedCoffeeShops = [];
  this.visitedCoffeeShops.forEach((shopId) => {
    if (shopId) {
      const existingShop = uniqueVisitedCoffeeShops.find((shop) =>
        shop.equals(shopId)
      );
      if (existingShop) {
        ++existingShop.count;
      } else {
        uniqueVisitedCoffeeShops.push(shopId);
      }
    }
  });
  this.visitedCoffeeShops = uniqueVisitedCoffeeShops;

  // Normalize orderedProducts to ensure unique orderId
  const uniqueOrderedProducts = [];
  this.orderedProducts.forEach((orderId) => {
    if (orderId) {
      const existingProduct = uniqueOrderedProducts.find((product) =>
        product.equals(orderId)
      );
      if (existingProduct) {
        ++existingProduct.count;
      } else {
        uniqueOrderedProducts.push(orderId);
      }
    }
  });
  this.orderedProducts = uniqueOrderedProducts;

  // Calculate mostOrderedThreeProducts
  if (this.orderedProducts.length > 0) {
    // Sort products by count in descending order
    const sortedProducts = this.orderedProducts.sort(
      (a, b) => b.count - a.count
    );

    // Take the top three products
    this.extraDetails.mostOrderedThreeProducts = sortedProducts.slice(0, 3);
  } else {
    this.extraDetails.mostOrderedThreeProducts = []; // Set to empty array if none
  }

  // Calculate mostGoingCoffeeShop
  if (this.visitedCoffeeShops.length > 0) {
    // Sort shops by count in descending order
    const sortedShops = this.visitedCoffeeShops.sort(
      (a, b) => b.count - a.count
    );

    // Set the most visited shop
    this.extraDetails.mostGoingCoffeeShop = sortedShops[0]._id; // Take the most visited shop
  } else {
    this.extraDetails.mostGoingCoffeeShop = null; // Set to null if none
  }

  next();
});

const User = mongoose.model("User", userSchema);
module.exports = User;
