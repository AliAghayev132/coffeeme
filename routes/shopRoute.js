const express = require("express");
const router = express.Router();
const Shop = require("../schemas/Shop");
const Product = require("../schemas/Product");
const multer = require("multer");
const fs = require("fs");
const validateAccessToken = require("../middlewares/validateToken");
const calculateWalkingTimes = require("../utils/calculateWalkingTimes");
const path = require("path");
const User = require("../schemas/User");
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
const PartnerShop = require("../schemas/PartnerShop");
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

router.get("/nearest", async (req, res) => {
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
router.get("/:id/products", async (req, res) => {
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
router.get("/:id", async (req, res) => {
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
router.get("/", async (req, res) => {
  try {
    const shops = await Shop.find();
    return res.status(201).json({ success: true, shops });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Products
// router.get("/find-product", async (req, res) => {
//   try {
//     const { name } = req.query;
//     if (!name || name.length < 3) {
//       return res.status(400).json({
//         error: "Name must be provided and at least 3 characters long",
//       });
//     }
//     const products = await Product.find({
//       name: { $regex: name, $options: "i" },
//     });
//     return res.status(200).json({ data: products });
//   } catch (error) {
//     return res.status(500).json({
//       error: "Internal server error",
//     });
//   }
// });

//! ********************
//!        Admin
//! ********************

/**
 * @swagger
 * tags:
 *   name: Shops
 *   description: Shop management API
 */
/**
 * @swagger
 * /shops:
 *   post:
 *     summary: Create a new shop
 *     tags: [Shops]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               longitude:
 *                 type: string
 *               latitude:
 *                 type: string
 *               address:
 *                 type: string
 *               logo:
 *                 type: string
 *                 format: binary
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Shop added successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /shops/{id}:
 *   delete:
 *     summary: Delete a shop
 *     tags: [Shops]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The shop id
 *     responses:
 *       200:
 *         description: Shop deleted successfully
 *       400:
 *         description: ID is required
 *       404:
 *         description: Shop not found
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /shops/{id}:
 *   put:
 *     summary: Update a shop
 *     tags: [Shops]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The shop id
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               longitude:
 *                 type: string
 *               latitude:
 *                 type: string
 *               address:
 *                 type: string
 *               logo:
 *                 type: string
 *                 format: binary
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Shop updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Shop not found
 *       500:
 *         description: Internal server error
 */

router.post(
  "/",
  upload.fields([{ name: "logo" }, { name: "photo" }]), // Multer middleware
  async (req, res) => {
    try {
      const { name, longitude, latitude, address } = req.body;

      if (!name || !longitude || !latitude || !address) {
        return res.status(400).json({
          error: "Name, longitude, address and latitude are required",
        });
      }

      const newShop = new Shop({
        address,
        name,
        location: {
          type: "Point",
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
        logo: req.files.logo ? req.files.logo[0].filename : "",
        photo: req.files.photo ? req.files.photo[0].filename : "",
      });

      await newShop.save();

      return res
        .status(201)
        .json({ data: newShop, message: "Shop added successfully" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "ID is required" });
    }
    const deletedShop = await Shop.findByIdAndDelete(id);
    if (!deletedShop) {
      return res.status(404).json({ error: "Shop not found" });
    }
    
    await PartnerShop.findOneAndDelete({ shop: id });
    await Product.deleteMany({ _id: { $in: deletedShop.products } });
    const shopDir = `public/uploads/shops/${deletedShop.name}-${deletedShop.address}`;
    if (fs.existsSync(shopDir)) {
      fs.rmSync(shopDir, { recursive: true, force: true });
    }
    return res.status(200).json({
      data: deletedShop,
      message: "Shop and associated files deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
router.put(
  "/:id",
  upload.fields([{ name: "logo" }, { name: "photo" }]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, longitude, latitude, address } = req.body;

      const shop = await Shop.findById(id);
      if (!shop) {
        return res.status(404).json({ error: "Shop not found" });
      }

      const oldDir = `public/uploads/shops/${shop.name}-${shop.address}`;

      if (name) shop.name = name;
      if (longitude && latitude) {
        shop.location = {
          type: "Point",
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        };
      }
      if (address) shop.address = address;

      const newDir = `public/uploads/shops/${shop.name}-${shop.address}`;

      if (oldDir !== newDir) {
        if (fs.existsSync(oldDir)) {
          if (!fs.existsSync(newDir)) {
            fs.mkdirSync(newDir, { recursive: true });
          }

          const files = fs.readdirSync(oldDir);
          files.forEach((file) => {
            fs.renameSync(path.join(oldDir, file), path.join(newDir, file));
          });

          fs.rmdirSync(oldDir);
        }
      }

      if (req.files["logo"]) {
        const logoFile = req.files["logo"][0];

        if (shop.logo) {
          const oldLogoPath = path.join(newDir, shop.logo);
          if (fs.existsSync(oldLogoPath)) {
            fs.unlinkSync(oldLogoPath);
          }
        }

        shop.logo = logoFile.filename;
        fs.renameSync(logoFile.path, path.join(newDir, logoFile.filename));
      }

      if (req.files["photo"]) {
        const photoFile = req.files["photo"][0];

        if (shop.photo) {
          const oldPhotoPath = path.join(newDir, shop.photo);
          if (fs.existsSync(oldPhotoPath)) {
            fs.unlinkSync(oldPhotoPath);
          }
        }

        shop.photo = photoFile.filename;
        fs.renameSync(photoFile.path, path.join(newDir, photoFile.filename));
      }

      await shop.save();

      return res
        .status(200)
        .json({ data: shop, message: "Shop updated successfully" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

module.exports = router;
