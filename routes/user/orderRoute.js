const express = require("express");
const router = express.Router();
const Order = require("../../schemas/Order");
const Product = require("../../schemas/Product");
const User = require("../../schemas/User");
const Shop = require("../../schemas/Shop");
const Partner = require("../../schemas/Partner");
const validateAccessToken = require("../../middlewares/validateToken");
const { PARTNERS_CONNECTIONS } = require("../../utils/socket/websokcetUtil");
const roundToTwoDecimals = require("../../utils/roundToTwoDecimals");
const balanceActivity = require("../../utils/user/balanceActivity");

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
      if (!product || product.shop.toString() !== reqShop.id) {
        return false;
      }

      const selectedSize = product.sizes.find(
        (size) => size.size === item.productSize
      );

      // Validate extras and syrups
      const extrasValid = item.additions?.extras
        ? item.additions.extras.every((addition) => {
            const additionId = addition._id.toString();
            return product.additions.extras.some(
              (a) => a._id.toString() === additionId
            );
          })
        : true;

      const syrupsValid = item.additions?.syrups
        ? item.additions.syrups.every((addition) => {
            const syrupId = addition._id.toString();
            return product.additions.syrups.some(
              (s) => s._id.toString() === syrupId
            );
          })
        : true;

      return selectedSize !== undefined && extrasValid && syrupsValid;
    });

    if (!validItems) {
      return res.status(400).json({
        message:
          "One or more items are invalid, or the selected size does not exist for the product",
      });
    }

    // Calculate total price
    const totalPrice = orderedItems.reduce((sum, item) => {
      const product = products.find(
        (p) => p._id.toString() === item.productId.toString()
      );
      const selectedSize = product.sizes.find(
        (size) => size.size === item.productSize
      );

      const extrasPrice =
        item.additions?.extras?.reduce((total, addition) => {
          const extra = product.additions.extras.find(
            (a) => a._id.toString() === addition._id.toString()
          );
          return total + (extra ? extra.price || 0 : 0);
        }, 0) || 0;

      const syrupsPrice =
        item.additions?.syrups?.reduce((total, syrup) => {
          const syrupItem = product.additions.syrups.find(
            (s) => s._id.toString() === syrup._id.toString()
          );
          return total + (syrupItem ? syrupItem.price || 0 : 0);
        }, 0) || 0;

      const itemPrice = selectedSize.price + extrasPrice + syrupsPrice;

      return roundToTwoDecimals(sum + item.productCount * itemPrice);
    }, 0);

    // Calculate total discounted price
    const totalDiscountedPrice = orderedItems.reduce((sum, item) => {
      const product = products.find(
        (p) => p._id.toString() === item.productId.toString()
      );
      const selectedSize = product.sizes.find(
        (size) => size.size === item.productSize
      );

      const extrasPrice =
        item.additions?.extras?.reduce((total, addition) => {
          const extra = product.additions.extras.find(
            (a) => a._id.toString() === addition._id.toString()
          );
          return (
            total +
            (extra
              ? category !== "standard"
                ? extra.discountedPrice
                : extra.price || 0
              : 0)
          );
        }, 0) || 0;

      const syrupsPrice =
        item.additions?.syrups?.reduce((total, syrup) => {
          const syrupItem = product.additions.syrups.find(
            (s) => s._id.toString() === syrup._id.toString()
          );
          return (
            total +
            (syrupItem
              ? category !== "standard"
                ? syrupItem.discountedPrice
                : syrupItem.price || 0
              : 0)
          );
        }, 0) || 0;

      const itemPrice =
        (category !== "standard"
          ? selectedSize.discountedPrice || 0
          : selectedSize.price || 0) +
        extrasPrice +
        syrupsPrice;

      return roundToTwoDecimals(sum + item.productCount * itemPrice);
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

        const extras =
          item.additions?.extras.map((extra) => {
            const productExtra = product.additions.extras.find(
              (e) => e._id.toString() === extra._id.toString()
            );
            return {
              name: productExtra.name,
              price: productExtra.price,
              discount: productExtra.discount,
              discountedPrice: productExtra.discountedPrice,
            };
          }) || [];

        const syrups =
          item.additions?.syrups.map((syrup) => {
            const productSyrup = product.additions.syrups.find(
              (s) => s._id.toString() === syrup._id.toString()
            );
            return {
              name: productSyrup.name,
              price: productSyrup.price,
              discount: productSyrup.discount,
              discountedPrice: productSyrup.discountedPrice,
            };
          }) || [];

        return {
          product: item.productId,
          quantity: item.productCount,
          type: item.productType,
          price: roundToTwoDecimals(selectedSize.price),
          discount: roundToTwoDecimals(selectedSize.discount),
          discountedPrice: roundToTwoDecimals(selectedSize.discountedPrice),
          size: selectedSize.size,
          additions: {
            extras,
            syrups,
          },
        };
      }),
      category,
      shop: reqShop.id,
      totalPrice,
      totalDiscountedPrice,
      message,
      status: "pending",
    });

    // Check if user balance is sufficient
    if (user.balance < totalDiscountedPrice) {
      return res
        .status(400)
        .json({ success: false, message: "User balance is insufficient" });
    }

    user.balance -= totalDiscountedPrice;
    const savedOrder = await newOrder.save();
    balanceActivity(user, {
      category: "order",
      title: `${shop.name} ${shop.shortAddress}`,
      amount: -newOrder.totalDiscountedPrice,
    });

    await user.save();

    await User.findOneAndUpdate(
      { email },
      { $push: { orders: savedOrder._id } }
    );
    await Partner.findOneAndUpdate(
      { shop: reqShop.id },
      { $push: { orders: savedOrder._id } }
    );

    // Notify partner if connected
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
    if (!product || product.shop.toString() !== reqShop.id) {
      return res.status(400).json({ message: "Invalid product or shop" });
    }

    const selectedSize = product.sizes.find(
      (size) => size.size === orderedItem.productSize
    );
    if (!selectedSize) {
      return res.status(400).json({ message: "Selected size does not exist" });
    }

    const validItems = () => {
      const orderedSyrup = orderedItem.additions.syrups[0];
      const orderedExtra = orderedItem.additions.extras[0];

      const validExtra = orderedExtra
        ? product.additions.extras.find(
            (a) => a._id.toString() === orderedExtra._id // product id'sini string'e çevir ve karşılaştır
          )
        : true;
      const validSyrup = orderedSyrup
        ? product.additions.syrups.find(
            (a) => a._id.toString() === orderedSyrup._id // product id'sini string'e çevir ve karşılaştır
          )
        : true;
      return Boolean(validExtra && validSyrup);
    };

    if (!validItems()) {
      return res.status(400).json({
        success: false,
        message: "Selected additions does not exist for the product",
      });
    }

    // Calculate total price (for a single item)
    const totalPrice =
      (selectedSize.price || 0) +
      (orderedItem.additions.syrups[0]
        ? orderedItem.additions.syrups[0].price
        : 0) +
      (orderedItem.additions.extras[0]
        ? orderedItem.additions.extras[0].price
        : 0);
    const totalDiscountedPrice =
      (category !== "standard" ? selectedSize.discountedPrice : totalPrice) +
      (orderedItem.additions.syrups[0]
        ? orderedItem.additions.syrups[0].discountedPrice
        : 0) +
      (orderedItem.additions.extras[0]
        ? orderedItem.additions.extras[0].discountedPrice
        : 0);

    const newOrder = new Order({
      user: user._id,
      items: [
        {
          category: user.category,
          product: orderedItem.productId,
          type: orderedItem.productType,
          quantity: orderedItem.productCount || 1,
          price: roundToTwoDecimals(totalPrice),
          discount: roundToTwoDecimals(selectedSize.discount),
          discountedPrice: roundToTwoDecimals(totalDiscountedPrice),
          size: selectedSize.size,
          additions: {
            syrups: orderedItem.additions.syrups[0]
              ? {
                  _id: orderedItem.additions.syrups[0]._id,
                  name: orderedItem.additions.syrups[0].name,
                  price: orderedItem.additions.syrups[0].price,
                  discountedPrice:
                    orderedItem.additions.syrups[0].discountedPrice,
                }
              : [],
            extras: orderedItem.additions.extras[0]
              ? {
                  _id: orderedItem.additions.extras[0]._id,
                  name: orderedItem.additions.extras[0].name,
                  price: orderedItem.additions.extras[0].price,
                  discountedPrice:
                    orderedItem.additions.extras[0].discountedPrice,
                }
              : [],
          },
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

      if (!product || product.shop.toString() !== reqShop.id) {
        return false;
      }

      const selectedSize = product.sizes.find(
        (size) => size.size === item.productSize
      );

      if (item.additions) {
        const extrasValid = item.additions.extras
          ? item.additions.extras.every((addition) => {
              // Hem item hem de product _id'lerini string formatına çeviriyoruz
              const additionId = addition._id.toString(); // addition id'sini string'e çevir
              const foundExtra = product.additions.extras.find(
                (a) => a._id.toString() === additionId // product id'sini string'e çevir ve karşılaştır
              );
              return foundExtra !== undefined;
            })
          : true;

        const syrupsValid = item.additions.syrups
          ? item.additions.syrups.every((addition) => {
              // Hem item hem de product _id'lerini string formatına çeviriyoruz
              const syrupId = addition._id.toString(); // addition id'sini string'e çevir
              const foundSyrup = product.additions.syrups.find(
                (s) => s._id.toString() === syrupId // product id'sini string'e çevir ve karşılaştır
              );
              return foundSyrup !== undefined;
            })
          : true;
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

      // Ekstraların toplam fiyatını hesapla
      const extrasPrice = item.additions.extras.length
        ? item.additions.extras.reduce((total, addition) => {
            const extra = product.additions.extras.find(
              (a) => a._id.toString() === addition._id.toString()
            );
            return (
              total +
              (extra
                ? category !== "standard"
                  ? extra.discountedPrice
                  : extra.price
                : 0)
            );
          }, 0)
        : 0;

      const syrupsPrice = item.additions?.syrups?.length
        ? item.additions.syrups.reduce((total, syrup) => {
            const syrupItem = product.additions.syrups.find(
              (s) => s._id.toString() === syrup._id.toString()
            );

            return (
              total +
              (syrupItem
                ? category !== "standard"
                  ? syrup.discountedPrice
                  : syrup.price
                : 0)
            );
          }, 0)
        : 0;

      const itemPrice =
        (category !== "standard"
          ? selectedSize.discountedPrice
          : selectedSize.price || 0) +
        extrasPrice +
        syrupsPrice;

      return roundToTwoDecimals(sum + item.productCount * itemPrice);
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
    if (!product || product.shop.toString() !== reqShop.id) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product for this shop" });
    }

    const selectedSize = product.sizes.find(
      (size) => size.size === orderedItem.productSize
    );

    const validItems = () => {
      const orderedSyrup = orderedItem.additions.syrups[0];
      const orderedExtra = orderedItem.additions.extras[0];

      const validExtra = orderedExtra
        ? product.additions.extras.find(
            (a) => a._id.toString() === orderedExtra._id // product id'sini string'e çevir ve karşılaştır
          )
        : true;
      const validSyrup = orderedSyrup
        ? product.additions.syrups.find(
            (a) => a._id.toString() === orderedSyrup._id // product id'sini string'e çevir ve karşılaştır
          )
        : true;
      return Boolean(validExtra && validSyrup);
    };

    if (!validItems()) {
      return res.status(400).json({
        success: false,
        message: "Selected additions does not exist for the product",
      });
    }

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
router.post("/again/:id", validateAccessToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.user;
    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const order = await Order.findById(id)
      .populate({
        path: "items.product", // Populate 'product' in each 'items' entry
      })
      .populate({
        path: "shop",
        populate: {
          path: "products", // Assuming 'products' is an array of product references in the Shop schema
        },
      });


    return res.status(200).json({ success: true, message: "Oops zort", order });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
