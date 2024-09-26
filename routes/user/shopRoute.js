const express = require("express");
const router = express.Router();
const Shop = require("../../schemas/Shop");
const Product = require("../../schemas/Product");
const Partner = require("../../schemas/Partner");
const validateAccessToken = require("../../middlewares/validateToken");
const calculateWalkingTimes = require("../../utils/calculateWalkingTimes");
const User = require("../../schemas/User");

router.get("/home", validateAccessToken, async (req, res) => {});
router.get("/nearest", validateAccessToken, async (req, res) => {
  try {
    const latitude = parseFloat(req.query.latitude);
    const longitude = parseFloat(req.query.longitude);

    if (!longitude || !latitude) {
      return res
        .status(400)
        .json({ error: "Longitude and latitude are required" });
    }

    const shops = await Shop.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          distanceField: "distance", // A valid field name to store the distance
          spherical: true, // This calculates the distance in meters using a spherical model
          minDistance: 0, // Or just omit this line to have unlimited distance
        },
      },
      { $limit: 5 },
    ]);
    // Yürüyüş sürelerini hesapla
    const resultsWithTimes = shops.map((shop) => {
      const walkingTimes = calculateWalkingTimes(
        parseFloat(latitude),
        parseFloat(longitude),
        shop.location.coordinates[1], // mağaza enlemi
        shop.location.coordinates[0] // mağaza boylamı
      );

      return {
        ...shop,
      };
    });

    return res.status(200).json({ shops: resultsWithTimes });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
router.get("/:id/products", validateAccessToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Find the shop by ID and populate the products using the product IDs
    const shop = await Shop.findById(id).populate("products");

    if (!shop) {
      return res.status(404).json({ error: "Shop not found" });
    }

    // Return the list of products associated with the shop
    return res.status(200).json({ products: shop.products });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
router.get("/:id", validateAccessToken, async (req, res) => {
  try {
    const { id } = req.params;
    const shop = await Shop.findById(id).populate("products"); // Populate the products field

    if (!shop) {
      return res.status(404).json({ error: "Shop not found" });
    }

    return res.status(200).json({ message: "Successfully got shop", shop });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
router.get("/", validateAccessToken, async (req, res) => {
  try {
    const shops = await Shop.find();
    return res.status(201).json({ success: true, shops });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Favorite Shop
router.post("/favorite/shop", validateAccessToken, async (req, res) => {
  try {
    const { shopId } = req.body;
    const { email } = req.user;

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }

    // Check if the shop is already a favorite
    if (!user.favorites.shops.includes(shopId)) {
      user.favorites.shops.push(shopId); // Add shop to favorites
      await user.save();
      return res
        .status(200)
        .json({ success: true, message: "Shop added to favorites" });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Shop is already in favorites" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
});
router.delete("/favorite/shop", validateAccessToken, async (req, res) => {
  try {
    const { shopId } = req.body;
    const { email } = req.user;

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (user.favorites.shops.includes(shopId)) {
      user.favorites.shops = user.favorites.shops.filter(
        (favoriteShopId) => favoriteShopId.toString() !== shopId
      );
      await user.save();
      return res
        .status(200)
        .json({ success: true, message: "Shop removed from favorites" });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Shop not found in favorites" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
});

// Favorite Product
router.post("/favorite/product", validateAccessToken, async (req, res) => {
  try {
    const { productId } = req.body;
    const { email } = req.user;

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Check if the product is already a favorite
    if (!user.favorites.products.includes(productId)) {
      user.favorites.products.push(productId); // Add product to favorites
      await user.save();
      return res
        .status(200)
        .json({ success: true, message: "Product added to favorites" });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Product is already in favorites" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
});
router.delete("/favorite/product", validateAccessToken, async (req, res) => {
  try {
    const { productId } = req.body;
    const { email } = req.user;

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Check if the product is in favorites and remove it
    if (user.favorites.products.includes(productId)) {
      user.favorites.products = user.favorites.products.filter(
        (favoriteProductId) => favoriteProductId.toString() !== productId
      );
      await user.save();
      return res.status(200).json({
        success: true,
        message: "Product removed from favorites",
      });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Product not found in favorites" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
});

// Shop Follow
router.get("/follow", validateAccessToken, async (req, res) => {
  try {
    const { email } = req.user; // JWT'den kullanıcı bilgisi

    const user = await User.findOne({ email }).populate("follows", "_id"); // Sadece shop ID'lerini getir
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const followedShops = user.follows.map((shop) => shop._id); // Shop ID'lerini bir dizi olarak al

    return res.status(200).json({ success: true, followedShops });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error });
  }
});
router.post("/follow", validateAccessToken, async (req, res) => {
  try {
    const { shopId } = req.body;
    const { email } = req.user;
    console.log(req.body);
    

    // Kullanıcıyı email ile bul
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }

    // Kullanıcı zaten takip ediyor mu kontrol et
    if (!user.follows.includes(shopId)) {
      user.follows.push(shopId); // Shop'u takip listesine ekle
      await user.save();

      // İlgili partneri bul ve takip eden kullanıcıyı ekle
      const partner = await Partner.findOne({ shop: shopId });
      if (partner && !partner.followers.includes(user._id)) {
        partner.followers.push(user._id);
        await partner.save();
      }

      console.log("Salam Bura Follow");
      
      return res.status(200).json({
        success: true,
        message: "Shop followed successfully",
        follow: "follow",
      });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Already following this shop" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
});
router.delete("/follow", validateAccessToken, async (req, res) => {
  try {
    const { shopId } = req.body;
    const { email } = req.user;

    // Kullanıcıyı email ile bul
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }

    // Takipten çıkarma işlemi
    if (user.follows.includes(shopId)) {
      user.follows = user.follows.filter(
        (followedShopId) => followedShopId.toString() !== shopId
      );
      await user.save();

      // İlgili partneri bul ve takip eden kullanıcıyı sil
      const partner = await Partner.findOne({ shop: shopId });
      if (partner && partner.followers.includes(user._id)) {
        partner.followers = partner.followers.filter(
          (followerId) => followerId.toString() !== user._id.toString()
        );
        await partner.save();
      }

      console.log("Salam Bura UnFollow");
      return res.status(200).json({
        success: true,
        message: "Shop unfollowed successfully",
        follow: "unfollow",
      });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Not following this shop" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
});

module.exports = router;
