const express = require("express");
const router = express.Router();
const Order = require("../../schemas/Order"); // Order model
const Product = require("../../schemas/Product"); // Product model
const User = require("../../schemas/User"); // User model
const Shop = require("../../schemas/Shop");
const Partner = require("../../schemas/Partner");
const validateAccessToken = require("../../middlewares/validateToken");
const { PARTNERS_CONNECTIONS } = require("../../utils/socket/websokcetUtil");
const roundToTwoDecimals = require("../../utils/roundToTwoDecimals");

router.get("/", validateAccessToken, async (req, res) => {
  try {
    const { email } = req.user;
    const user = await User.findOne({ email }).populate({
      path: "orders",
      populate: [
        {
          path: "items.product", // Populate product inside items
          model: "Product",
        },
        {
          path: "shop", // Populate the shop field
          model: "Shop",
        },
      ],
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const orders = user.orders;
    return res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server errro" });
  }
});
router.post("/", validateAccessToken, async (req, res) => {
  try {
    const { orderedItems, shop: reqShop, message } = req.body;
    const { email } = req.user;

    console.log({ orderedItems });

    if (!orderedItems || orderedItems.length <= 0) {
      return res.status(400).json({ message: "No ordered items provided" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const { category } = user;

    if (user.orders.length >= 3) {
      return res
        .status(400)
        .json({ message: "You have reached the order limit" });
    }

    const shop = await Shop.findById(reqShop.id);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const productIds = orderedItems.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });

    const validItems = orderedItems.every((item) => {
      const product = products.find(
        (p) => p._id.toString() === item.productId.toString()
      );
      if (!product || product.shop.id.toString() !== reqShop.id.toString()) {
        return false;
      }

      const selectedSize = product.sizes.find(
        (size) => size.size === item.productSize
      );
      return selectedSize !== undefined;
    });

    if (!validItems) {
      return res.status(400).json({
        message:
          "One or more items are invalid, or the selected size does not exist for the product",
      });
    }

    const totalPrice = orderedItems.reduce((sum, item) => {
      const product = products.find(
        (p) => p._id.toString() === item.productId.toString()
      );
      const selectedSize = product.sizes.find(
        (size) => size.size === item.productSize
      );
      return roundToTwoDecimals(
        sum + item.productCount * (selectedSize.price || 0)
      );
    }, 0);

    const totalDiscountedPrice = orderedItems.reduce((sum, item) => {
      const product = products.find(
        (p) => p._id.toString() === item.productId.toString()
      );
      const selectedSize = product.sizes.find(
        (size) => size.size === item.productSize
      );
      return roundToTwoDecimals(
        sum +
          item.productCount *
            (category !== "standard"
              ? selectedSize.discountedPrice
              : selectedSize.price || 0)
      );
    }, 0);

    const newOrder = new Order({
      user: user._id,
      items: orderedItems.map((item) => {
        const product = products.find(
          (p) => p._id.toString() === item.productId.toString()
        );
        const selectedSize = product.sizes.find(
          (size) => size.size === item.productSize
        );
        return {
          category: user.category,
          product: item.productId,
          quantity: item.productCount,
          price: roundToTwoDecimals(selectedSize.price),
          discount: roundToTwoDecimals(selectedSize.discount),
          discountedPrice: roundToTwoDecimals(selectedSize.discountedPrice),
          size: selectedSize.size,
        };
      }),
      shop: reqShop.id,
      totalPrice,
      totalDiscountedPrice,
      message,
      status: "pending",
    });

    if (user.balance < totalDiscountedPrice) {
      return res
        .status(400)
        .json({ success: false, message: "User balance is insufficient" });
    }
    user.balance -= totalDiscountedPrice;
    const savedOrder = await newOrder.save();
    await user.save();
    await User.findOneAndUpdate(
      { email },
      { $push: { orders: savedOrder._id } }
    );
    await Partner.findOneAndUpdate(
      { shop: reqShop.id },
      { $push: { orders: savedOrder._id } }
    );

    const partner = await Partner.findOne({ shop: reqShop.id });
    if (partner && PARTNERS_CONNECTIONS[partner._id]) {
      PARTNERS_CONNECTIONS[partner._id].send(
        JSON.stringify({
          type: "ORDER_STATUS",
          state: "NEW",
          user: {
            firstname: user.firstname,
            secondname: user.secondname,
          },
        })
      );
    }
    return res.status(201).json({ message: "Order saved", savedOrder });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error creating order", error });
  }
});
router.post("/loyalty", validateAccessToken, async (req, res) => {
  try {
    const { orderedItem, shop: reqShop, message } = req.body; // Changed to orderedItem for a single item
    const { email } = req.user;

    // Validate the presence of orderedItem
    if (!orderedItem) {
      return res.status(400).json({ message: "No ordered item provided" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const { category } = user;

    if (user.orders.length >= 3) {
      return res
        .status(400)
        .json({ message: "You have reached the order limit" });
    }

    const shop = await Shop.findById(reqShop.id);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const product = await Product.findById(orderedItem.productId); // Fetch single product
    if (!product || product.shop.id.toString() !== reqShop.id.toString()) {
      return res.status(400).json({ message: "Invalid product or shop" });
    }

    const selectedSize = product.sizes.find(
      (size) => size.size === orderedItem.productSize
    );
    if (!selectedSize) {
      return res.status(400).json({ message: "Selected size does not exist" });
    }

    // Calculate total price (for a single item)
    const totalPrice = selectedSize.price || 0;
    const totalDiscountedPrice =
      category !== "standard" ? selectedSize.discountedPrice : totalPrice;

    const newOrder = new Order({
      user: user._id,
      items: [
        {
          category: user.category,
          product: orderedItem.productId,
          quantity: orderedItem.productCount, // Assuming this is 1 for loyalty orders
          price: roundToTwoDecimals(totalPrice),
          discount: roundToTwoDecimals(selectedSize.discount),
          discountedPrice: roundToTwoDecimals(totalDiscountedPrice),
          size: selectedSize.size,
        },
      ],
      shop: reqShop.id,
      totalPrice,
      totalDiscountedPrice,
      message,
      status: "pending",
      loyalty: true, // Set loyalty to true
    });

    // Deduct the price from user balance
    user.loyalty = 0;
    const savedOrder = await newOrder.save();
    await user.save();
    await User.findOneAndUpdate(
      { email },
      { $push: { orders: savedOrder._id } }
    );
    await Partner.findOneAndUpdate(
      { shop: reqShop.id },
      { $push: { orders: savedOrder._id } }
    );

    const partner = await Partner.findOne({ shop: reqShop.id });
    if (partner && PARTNERS_CONNECTIONS[partner._id]) {
      PARTNERS_CONNECTIONS[partner._id].send(
        JSON.stringify({
          type: "ORDER_STATUS",
          state: "NEW",
          user: {
            firstname: user.firstname,
            secondname: user.secondname,
          },
        })
      );
    }

    console.log(savedOrder);

    return res.status(201).json({ message: "Order saved", savedOrder });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error creating order", error });
  }
});
router.post("/checkout", validateAccessToken, async (req, res) => {
  try {
    const { orderedItems, shop: reqShop } = req.body;
    const { email } = req.user;

    if (!orderedItems || orderedItems.length <= 0) {
      return res.status(400).json({ message: "No ordered items provided" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const { category } = user;

    if (user.orders.length >= 3) {
      return res
        .status(400)
        .json({ message: "You have reached the order limit" });
    }

    const shop = await Shop.findById(reqShop.id);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const productIds = orderedItems.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });

    const validItems = orderedItems.every((item) => {
      const product = products.find(
        (p) => p._id.toString() === item.productId.toString()
      );
      if (!product || product.shop.id.toString() !== reqShop.id.toString()) {
        return false;
      }

      const selectedSize = product.sizes.find(
        (size) => size.size === item.productSize
      );
      
      if (item.additions) {
        const extrasValid = item.additions.extras
          ? item.additions.extras.every((addition) =>
              product.additions.extras.find((a) => a._id === addition._id)
            )
          : true; // Ekstra yoksa geçerli kabul et

        const syrupsValid = item.additions.syrups
          ? item.additions.syrups.every((syrup) =>
              product.additions.syrups.find((s) => s._id === syrup._id)
            )
          : true; // Şurup yoksa geçerli kabul et

        return selectedSize !== undefined && extrasValid && syrupsValid;
      }

      return selectedSize !== undefined;
    });

    if (!validItems) {
      return res.status(400).json({
        message:
          "One or more items are invalid, or the selected size does not exist for the product",
      });
    }

    const totalDiscountedPrice = orderedItems.reduce((sum, item) => {
      const product = products.find(
        (p) => p._id.toString() === item.productId.toString()
      );
      const selectedSize = product.sizes.find(
        (size) => size.size === item.productSize
      );
      return roundToTwoDecimals(
        sum +
          item.productCount *
            (category !== "standard"
              ? selectedSize.discountedPrice
              : selectedSize.price || 0)
      );
    }, 0);

    return res.status(201).json({
      success: true,
      message: "Order price checkout",
      totalDiscountedPrice,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error during checkout", error });
  }
});
router.post("/checkout-loyalty", validateAccessToken, async (req, res) => {
  try {
    const { orderedItem, shop: reqShop } = req.body; // Expecting a single item
    const { email } = req.user;

    // Check if the orderedItem is provided
    if (!orderedItem || typeof orderedItem !== "object") {
      return res
        .status(400)
        .json({ success: false, message: "No ordered item provided" });
    }

    // Ensure no additional items are included
    if (Array.isArray(orderedItem)) {
      return res
        .status(400)
        .json({ success: false, message: "Only one item can be ordered" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Check if the user has reached the order limit
    if (user.orders.length >= 3) {
      return res
        .status(400)
        .json({ message: "You have reached the order limit" });
    }

    const shop = await Shop.findById(reqShop.id);
    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }

    const productId = orderedItem.productId;
    const product = await Product.findById(productId);

    // Validate the product and size
    if (!product || product.shop.id.toString() !== reqShop.id.toString()) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product for this shop" });
    }

    const selectedSize = product.sizes.find(
      (size) => size.size === orderedItem.productSize
    );
    if (!selectedSize) {
      return res.status(400).json({
        success: false,
        message: "Selected size does not exist for the product",
      });
    }

    // Check if the user is eligible for a free item
    const isEligibleForFreeItem = user.loyalty >= 10; // Adjust the loyalty points threshold if needed

    if (!isEligibleForFreeItem) {
      return res.status(400).json({
        success: false,
        message: "You are not eligible for a free item",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Order placed successfully for free",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error during checkout", error });
  }
});

module.exports = router;
