const express = require("express");
const router = express.Router();
const fs = require("fs");
const multer = require("multer");
const Shop = require("../../schemas/Shop");
const Product = require("../../schemas/Product");
const path = require("path");
const validateAccessToken = require("../../middlewares/validateToken");

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

router.post(
  "/:id",
  validateAccessToken,
  upload.single("photo"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, sizes, category, description, discountType, type } =
        req.body;

      if (
        !name ||
        !sizes ||
        !category ||
        !description ||
        !discountType ||
        !type
      ) {
        return res.status(400).json({ error: "All fields are required" });
      }

      const shop = await Shop.findById(id);

      if (!shop) {
        return res.status(404).json({ error: "Shop not found" });
      }

      let parsedSizes;
      if (typeof sizes === "string") {
        parsedSizes = JSON.parse(sizes);
      } else {
        parsedSizes = sizes;
      }

      const newProduct = new Product({
        type,
        name,
        sizes: parsedSizes,
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
      shop.products.push(newProduct._id);
      await shop.save();

      return res
        .status(201)
        .json({ message: "Product created successfully", data: newProduct });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);
router.delete("/:id", validateAccessToken, async (req, res) => {
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
router.put(
  "/:id",
  validateAccessToken,
  upload.single("photo"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, sizes, category, description, discountType } = req.body;

      if (!name || !sizes || !category || !description || !discountType) {
        return res.status(400).json({ error: "All fields are required" });
      }

      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      let parsedSizes;
      if (typeof sizes === "string") {
        parsedSizes = JSON.parse(sizes);
      } else {
        parsedSizes = sizes;
      }

      product.name = name;
      product.sizes = parsedSizes;
      product.category = category;
      product.description = description;
      product.discountType = discountType;

      if (req.file) {
        const photoFile = req.file;
        const shopId = product.shop.id;
        const dir = `public/uploads/products/${shopId}`;

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
  }
);
router.get("/", validateAccessToken, async (req, res) => {
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
router.delete(
  "/:productId/sizes/:sizeName",
  validateAccessToken,
  async (req, res) => {
    try {
      const { productId, sizeName } = req.params;
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      const updatedSizes = product.sizes.filter(
        (size) => size.size !== sizeName
      );
      product.sizes = updatedSizes;
      await product.save();
      return res
        .status(200)
        .json({ message: "Size removed successfully", data: product });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

module.exports = router;
