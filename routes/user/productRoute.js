const express = require("express");
const router = express.Router();
const fs = require("fs");
const multer = require("multer");
const Shop = require("../schemas/Shop");
const Product = require("../schemas/Product");
const path = require("path");

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
/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Update a product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The product ID
 *       - in: formData
 *         name: name
 *         schema:
 *           type: string
 *         required: false
 *         description: Name of the product
 *       - in: formData
 *         name: price
 *         schema:
 *           type: number
 *         required: false
 *         description: Price of the product
 *       - in: formData
 *         name: discount
 *         schema:
 *           type: number
 *         required: false
 *         description: Discount on the product
 *       - in: formData
 *         name: discountType
 *         schema:
 *           type: string
 *         required: false
 *         description: Type of discount (percentage/amount)
 *       - in: formData
 *         name: category
 *         schema:
 *           type: string
 *         required: false
 *         description: Category of the product
 *       - in: formData
 *         name: description
 *         schema:
 *           type: string
 *         required: false
 *         description: Description of the product
 *       - in: formData
 *         name: photo
 *         schema:
 *           type: string
 *         format: binary
 *         required: false
 *         description: Image file of the product
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Product updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Product not found
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

//! ********************
//!        Admin
//! ********************

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
router.put("/:id", upload.single("photo"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, discount, category, description, discountType } =
      req.body;

    const product = await Product.findByIdAndUpdate(
      id,
      { name, price, discount, category, description, discountType },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const shopId = product.shop.id;
    const dir = `public/uploads/products/${shopId}`;

    if (req.file) {
      const photoFile = req.file;

      if (product.photo) {
        const oldPhotoPath = path.join(dir, product.photo);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }

      product.photo = photoFile.filename;
      const newPhotoPath = path.join(dir, photoFile.filename);
      fs.renameSync(photoFile.path, newPhotoPath);
    }

    await product.save();

    return res
      .status(200)
      .json({ data: product, message: "Product updated successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
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

module.exports = router;
