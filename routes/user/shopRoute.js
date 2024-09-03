const express = require("express");
const router = express.Router();
const Shop = require("../../schemas/Shop");
const Product = require("../../schemas/Product");
const multer = require("multer");
const fs = require("fs");
const validateAccessToken = require("../middlewares/validateToken");
const calculateWalkingTimes = require("../utils/calculateWalkingTimes");
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

//NOTE: Endpoints For Shops

/**
 * @swagger
 * /shops:
 *   get:
 *     summary: Get all shops
 *     tags: [Shops]
 *     responses:
 *       200:
 *         description: A list of all shops
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 shops:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Shop'
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /shops/nearest:
 *   get:
 *     summary: Get nearest shops based on user's location
 *     tags: [Shops]
 *     parameters:
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: string
 *         required: true
 *         description: User's latitude
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: string
 *         required: true
 *         description: User's longitude
 *     responses:
 *       200:
 *         description: A list of nearest shops with walking times
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 shops:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       shop:
 *                         $ref: '#/components/schemas/Shop'
 *                       walkingTimes:
 *                         type: array
 *                         items:
 *                           type: string
 *       400:
 *         description: Longitude and latitude are required
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /shops/{id}:
 *   get:
 *     summary: Get a shop by ID
 *     description: Retrieves a shop and its products by shop ID.
 *     tags: [Shops]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the shop to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved shop
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Successfully got shop
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: ID of the shop
 *                       example: 60d6f6c7d42b4f001c8d1b08
 *                     name:
 *                       type: string
 *                       description: Name of the shop
 *                       example: Coffee Shop
 *                     address:
 *                       type: string
 *                       description: Address of the shop
 *                       example: 123 Coffee St
 *                     products:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: ID of the product
 *                             example: 60d6f6c7d42b4f001c8d1b09
 *                           name:
 *                             type: string
 *                             description: Name of the product
 *                             example: Espresso
 *                           price:
 *                             type: number
 *                             description: Price of the product
 *                             example: 2.99
 *       404:
 *         description: Shop not found
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /shops/{id}/products:
 *   get:
 *     summary: Get all products associated with a specific shop by shop ID
 *     tags: [Shops]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The shop ID
 *     responses:
 *       200:
 *         description: List of products associated with the shop
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *       404:
 *         description: Shop not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Shop not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Internal server error
 */

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
