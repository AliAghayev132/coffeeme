const express = require("express");
const router = express.Router();
const Shop = require("../../schemas/Shop");
const Product = require("../../schemas/Product");
const Partner = require("../../schemas/Partner");
const validateAccessToken = require("../../middlewares/validateToken");
const calculateWalkingTimes = require("../../utils/calculateWalkingTimes");
const User = require("../../schemas/User");
// NOTE: Controllers
const shopController = require("../../controllers/user/shopController");




// Favorite Shop
router.get("/favorite", validateAccessToken, async (req, res) => {
  try {
    const { email } = req.user;
    const user = await User.findOne({ email })
      .populate({
        path: "favorites.shops",
        select: "_id name address photo logo shortAddress discountPercentage",
      })
      .populate({
        path: "favorites.products",
        select: "_id name photo rating sizes shop",
        populate: {
          path: "shop",
          select: "name logo shortAddress",
        },
      });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const favoriteShops = user.favorites.shops.map((shop) => ({
      _id: shop._id,
      name: shop.name,
      address: shop.address,
      logo: shop.logo,
      photo: shop.photo,
      shortAddress: shop.shortAddress,
    }));

    const favoriteProducts = user.favorites.products.map((product) => ({
      _id: product._id,
      name: product.name,
      photo: product.photo,
      rating: product.rating,
      discount: product.sizes.length > 0 ? product.sizes[0].discount : 0, // Assuming first size's discount is sufficient
      shop: {
        id: product.shop.id, // Include shop ID
        name: product.shop.name, // Include shop name
        shortAddress: product.shop.shortAddress,
      },
    }));

    return res.status(200).json({
      success: true,
      favoriteShops,
      favoriteProducts,
    });
  } catch (error) {
    console.log(error);

    return res
      .status(500)
      .json({ success: false, message: "Server error", error });
  }
});
router.post("/favorite", validateAccessToken, async (req, res) => {
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
      return res.status(200).json({
        success: true,
        message: "Shop added to favorites",
        favorite: true,
      });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Shop is already in favorites" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
});
router.delete("/favorite", validateAccessToken, async (req, res) => {
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
      return res.status(200).json({
        success: true,
        message: "Shop removed from favorites",
        favorite: false,
      });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Shop not found in favorites" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
});
// Search
router.get("/search-recent", validateAccessToken, async (req, res) => {
  try {
    const { email } = req.user; // Extract user info from JWT

    // Find the user and populate recent searched items
    const user = await User.findOne({ email })
      .populate({
        path: "recentSearched.shops.item", // Populate shop items
        select:
          "_id name address shortAddress rating photo logo discountPercentage",
      })
      .populate({
        path: "recentSearched.products.item", // Populate product items
        select: "_id name photo rating sizes shop",
        populate: {
          path: "shop", // Nested populate for shop info in products
          select: "shortAddress name", // Select specific fields from shop
        },
      });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Format the recent searches
    const recentSearches = [
      ...user.recentSearched.shops.map((search) => {
        const item = search.item;
        if (!item) return null; // If the item is missing, return null

        return {
          _id: item._id,
          name: item.name,
          address: item.address,
          shortAddress: item.shortAddress,
          discountPercentage: item.discountPercentage,
          rating: item.rating,
          photo: item.photo,
          logo: item.logo, // Include shop's logo
          itemType: "Shop",
        };
      }),
      ...user.recentSearched.products.map((search) => {
        const item = search.item;
        if (!item) return null; // If the item is missing, return null

        return {
          _id: item._id,
          name: item.name,
          photo: item.photo,
          rating: item.rating,
          discount: item.sizes.length > 0 ? item.sizes[0].discount : 0, // Get discount from first size
          discountedPrice:
            item.sizes.length > 0 ? item.sizes[0].discountedPrice : 0,
          price: item.sizes.length > 0 ? item.sizes[0].price : 0,
          shop: item.shop
            ? {
              // Include shop details if available
              _id: item.shop._id,
              name: item.shop.name,
              shortAddress: item.shop.shortAddress,
            }
            : null,
          itemType: "Product",
        };
      }),
    ].filter(Boolean); // Remove any null values

    return res.status(200).json({
      success: true,
      recentSearches,
    });
  } catch (error) {
    console.error("Error fetching recent searches:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error });
  }
});
// router.get("/search/:query", validateAccessToken, async (req, res) => {
//   try {
//     const { query } = req.params;
//     if (query.length < 3) {
//       return res.status(400).json({
//         success: false,
//         message: "Query Length must be more than 3 chars",
//       });
//     }

//     // Perform a case-insensitive search for shops and products by name
//     const shops = await Shop.find({
//       $or: [
//         { name: { $regex: query, $options: "i" } },
//         { shortAddress: { $regex: query, $options: "i" } },
//       ], // Case-insensitive match
//     }).select(
//       "_id name rating address shortAddress logo photo discountPercentage"
//     );

//     const products = await Product.find({
//       name: { $regex: query, $options: "i" }, // Case-insensitive match
//     })
//       .select("_id name photo rating sizes")
//       .populate({
//         path: "shop",
//         select: "name logo shortAddress", // Populate the shop details for products
//       });

//     // Format the products to include shop details

//     const formattedProducts = products.map((product) => ({
//       _id: product._id,
//       name: product.name,
//       photo: product.photo,
//       rating: product.rating,
//       discount: product.sizes.length > 0 ? product.sizes[0].discount : 0, // Get discount from first size
//       discountedPrice:
//         product.sizes.length > 0 ? product.sizes[0].discountedPrice : 0,
//       price: product.sizes.length > 0 ? product.sizes[0].price : 0,
//       shop: product.shop,
//     }));

//     // Return both shops and products in the response
//     return res.status(200).json({
//       success: true,
//       shops,
//       products: formattedProducts,
//     });
//   } catch (error) {
//     console.log(error);
//     return res
//       .status(500)
//       .json({ success: false, message: "Server error", error });
//   }
// });
router.post("/search/remove", validateAccessToken, shopController.removeFromRecent);
router.post("/search/clicked", validateAccessToken, async (req, res) => {
  try {
    const { itemId, itemType } = req.body; // Extract itemId and itemType from request body
    const { email } = req.user; // Extract user info from JWT

    // Validate itemType
    if (!["Shop", "Product"].includes(itemType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item type. Must be either 'Shop' or 'Product'.",
      });
    }

    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Check if the item is already in recentSearched
    const alreadySearched = user.recentSearched[
      itemType.toLowerCase() + "s"
    ].some((search) => search.item.toString() === itemId);

    // If already searched, move it to the front (remove and add again)
    if (alreadySearched) {
      user.recentSearched[itemType.toLowerCase() + "s"] = user.recentSearched[
        itemType.toLowerCase() + "s"
      ].filter((search) => search.item.toString() !== itemId);
    }

    // Add the new item at the beginning of the respective array
    user.recentSearched[itemType.toLowerCase() + "s"].unshift({ item: itemId });

    // Limit to 5 items in each array
    if (user.recentSearched[itemType.toLowerCase() + "s"].length > 5) {
      user.recentSearched[itemType.toLowerCase() + "s"].pop();
    }

    // Save the updated user
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Search added to recent searches",
      recentSearched: user.recentSearched,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});
router.get("/search/:query", validateAccessToken, async (req, res) => {
  try {
    const { query } = req.params;

    const shops = await Shop.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { shortAddress: { $regex: query, $options: "i" } },
      ], // Case-insensitive match
    }).select(
      "_id name rating address shortAddress logo photo discountPercentage"
    );

    const products = await Product.find({
      name: { $regex: query, $options: "i" }, // Case-insensitive match
    })
      .select("_id name photo rating sizes")
      .populate({
        path: "shop",
        select: "name logo shortAddress", // Populate the shop details for products
      });

    // Format the products to include shop details

    const formattedProducts = products.map((product) => ({
      _id: product._id,
      name: product.name,
      photo: product.photo,
      rating: product.rating,
      discount: product.sizes.length > 0 ? product.sizes[0].discount : 0, // Get discount from first size
      discountedPrice:
        product.sizes.length > 0 ? product.sizes[0].discountedPrice : 0,
      price: product.sizes.length > 0 ? product.sizes[0].price : 0,
      shop: product.shop,
    }));

    // Return both shops and products in the response
    return res.status(200).json({
      success: true,
      shops,
      products: formattedProducts,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error });
  }
});
router.get("/search/byname/:query", validateAccessToken, async (req, res) => {
  try {
    const { query } = req.params;

    const shops = await Shop.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { shortAddress: { $regex: query, $options: "i" } },
      ],
    }).select(
      "_id name rating address shortAddress logo photo discountPercentage location"
    );


    return res.status(200).json({
      success: true,
      shops,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error });
  }
})



// Favorite Product
router.post("/favorite-product", validateAccessToken, async (req, res) => {
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
      return res.status(200).json({
        success: true,
        message: "Product added to favorites",
        favorite: true,
      });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Product is already in favorites" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
});
router.delete("/favorite-product", validateAccessToken, async (req, res) => {
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
        favorite: false,
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
    const { email } = req.user; // Extract user info from JWT

    // Find the user and populate the shop details
    const user = await User.findOne({ email }).populate({
      path: "follows",
      select:
        "_id name photo logo rating address shortAddress discountPercentage", // Only bring shop details
      model: "Shop",
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Get followed shop details and find the partner details for each shop
    const followedShops = await Promise.all(
      user.follows.map(async (shop) => {
        return {
          _id: shop._id,
          name: shop.name,
          logo: shop.logo,
          rating: shop.rating,
          photo: shop.photo,
          address: shop.address,
          shortAddress: shop.shortAddress,
          discountPercentage: shop.discountPercentage, // Include percentage if found, otherwise null
        };
      })
    );

    return res.status(200).json({ success: true, followedShops });
  } catch (error) {
    console.log(error);
    return res

      .status(500)
      .json({ success: false, message: "Server error", error });
  }
});
router.post("/follow", validateAccessToken, async (req, res) => {
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
          distanceField: "distance", 
          spherical: true, 
          minDistance: 0,
        },
      },
      { $limit: 15 },
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
        walkingTimes,
      };
    });

    return res.status(200).json({ shops: resultsWithTimes });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
router.get("/nearest-all", validateAccessToken, async (req, res) => {
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
        walkingTimes,
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

module.exports = router;
