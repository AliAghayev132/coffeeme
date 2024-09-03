const express = require("express");
const router = express.Router();
const Shop = require("../../schemas/Shop");
const Product = require("../../schemas/Product");
const multer = require("multer");
const fs = require("fs");
const validateAccessToken = require("../../middlewares/validateToken");
const calculateWalkingTimes = require("../../utils/calculateWalkingTimes");
const path = require("path");
const User = require("../../schemas/User");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = `public/uploads/shops/${req.body.name}-${req.body.address}`;

    // Dizin var mı kontrol et, yoksa oluştur
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname.toLowerCase());
  },
});
const Partner = require("../../schemas/Partner");
const upload = multer({ storage: storage });

//? ********************
//?        Users
//? ********************

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
          maxDistance: 50000,
          spherical: true,
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
