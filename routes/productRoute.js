const express = require("express");
const router = express.Router();
const fs = require("fs");
const multer = require("multer");
const Shop = require("../schemas/Shop");
const Product = require("../schemas/Product");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const { id } = req.params;
    const dir = `public/uploads/products/${id}`;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname.toLowerCase());
  },
});

const upload = multer({ storage: storage });

//NOTE: Endpoints For Products

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: A list of all products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /products/{id}:
 *   post:
 *     summary: Create a new product in a shop
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The shop ID where the product will be added
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               discount:
 *                 type: number
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               discountType:
 *                 type: string
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Bad request, all fields are required
 *       404:
 *         description: Shop not found
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Delete a product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Product not found or shop not found
 *       500:
 *         description: Internal server error
 */

//! ********************
//!        Admin
//! ********************

router.get("/", async (req, res) => {
  try {
    const products = await Product.find({});
    return res
      .status(201)
      .json({ message: "Product got successfully", data: products });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
router.post("/:id", upload.single("photo"), async (req, res) => {
  try {
    const { id } = req.params; // shopId
    const { name, price, discount, category, description, discountType } =
      req.body;

    if (!name || !price || !category || !description || !discountType) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const shop = await Shop.findById(id);
    console.log({ shop, id });

    if (!shop) {
      return res.status(404).json({ error: "Shop not found" });
    }

    const discountedPrice = discount ? price - (price * discount) / 100 : price;

    const newProduct = new Product({
      name,
      price,
      discount,
      discountedPrice,
      category,
      description,
      discountType,
      shop: {
        id: shop._id,
        name: shop.name,
        logo: shop.logo,
      },
      photo: req.file ? req.file.filename : null,
    });

    await newProduct.save();
    shop.products.push(newProduct);
    await shop.save();
    return res
      .status(201)
      .json({ message: "Product created successfully", data: newProduct });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(400).json({ error: "Product not found" });
    }
    const shop = await Shop.findById(product.shop.id);
    if (!shop) {
      return res
        .status(400)
        .json({ error: "Shop not found, but product deleted from db" });
    }
    shop.products = shop.products.filter((p) => !p.equals(product.id));

    const productDir = `public/uploads/products/${shop.id}`;
    if (fs.existsSync(productDir)) {
      fs.rmSync(productDir, { recursive: true, force: true });
    }

    await shop.save();
    return res
      .status(201)
      .json({ message: "Product deleted successfully", data: product });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
