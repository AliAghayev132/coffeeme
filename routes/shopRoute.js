const express = require("express");
const router = express.Router();
const Shop = require("../schemas/Shop");
const Product = require("../schemas/Product");
const multer = require("multer");
const fs = require("fs");
const validateAccessToken = require("../middlewares/validateToken");
const path = require("path");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../public/uploads/temp');

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    const fileName =
      file.fieldname === "logo"
        ? `logo_${timestamp}${ext}`
        : `photo_${timestamp}${ext}`;
    cb(null, fileName);
  },
});

const upload = multer({ storage: storage });

//? For User
//Shop
router.get("/", async (req, res) => {
  try {
    const shops = await Shop.find();
    return res.status(201).json({ success: true, shops });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});
router.get("/nearest", async (req, res) => {
  try {
    const { longitude, latitude } = req.query;

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
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          distanceField: "distance",
          maxDistance: 50000,
          spherical: true,
        },
      },
      { $limit: 5 },
    ]);

    return res.status(200).json({ shops });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
// Products
router.get("/find-product", async (req, res) => {
  try {
    const { name } = req.query;
    if (!name || name.length < 3) {
      return res.status(400).json({
        error: "Name must be provided and at least 3 characters long",
      });
    }
    const products = await Product.find({
      name: { $regex: name, $options: "i" },
    });
    return res.status(200).json({ data: products });
  } catch (error) {
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

//! For Admin

// Shop
router.post(
  "/add",
  upload.fields([{ name: "logo" }, { name: "photo" }]), // Multer middleware
  async (req, res) => {
    try {
      const { name, longitude, latitude, address } = req.body;

      if (!name || !longitude || !latitude) {
        return res
          .status(400)
          .json({ error: "Name, longitude, and latitude are required" });
      }

      // Yeni Shop kaydı oluşturulur
      const newShop = new Shop({
        address,
        name,
        location: {
          type: "Point",
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
      });

      // Shop kaydını kaydediyoruz
      await newShop.save();

      const shopDir = path.join(__dirname, `../public/uploads/${newShop._id}`);

      // Shop ID ile yeni bir klasör oluşturuyoruz
      if (!fs.existsSync(shopDir)) {
        fs.mkdirSync(shopDir, { recursive: true });
      }

      // Fotoğrafları Shop ID'ye göre yeniden adlandırıp klasöre taşıyoruz
      if (req.files["logo"]) {
        const logoFile = req.files["logo"][0];
        const logoExt = path.extname(logoFile.originalname);
        const newLogoName = `${newShop._id}Logo${logoExt}`;
        const newLogoPath = path.join(shopDir, newLogoName);

        fs.renameSync(logoFile.path, newLogoPath);
        newShop.logo = `${newShop._id}/${newLogoName}`;
      }

      if (req.files["photo"]) {
        const photoFile = req.files["photo"][0];
        const photoExt = path.extname(photoFile.originalname);
        const newPhotoName = `${newShop._id}Photo${photoExt}`;
        const newPhotoPath = path.join(shopDir, newPhotoName);

        fs.renameSync(photoFile.path, newPhotoPath);
        newShop.photo = `${newShop._id}/${newPhotoName}`;
      }

      // Shop kaydını güncelleriz
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

module.exports = router;
router.delete("/delete", async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: "ID is required" });
    }
    const deletedShop = await Shop.findByIdAndDelete(id);
    if (!deletedShop) {
      return res.status(404).json({ error: "Shop not found" });
    }
    const shopDir = path.join(
      __dirname,
      `public/uploads/coffeeshop/${deletedShop.name}`
    );
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
// Products
router.post("/add-product", async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: "Id is required" });
    }

    const shop = await Shop.findById(id);
    if (!shop) {
      return res.status(404).json({ error: "Shop not found" });
    }

    const { name, price, discount, category } = req.body;
    const newProduct = new Product({
      name,
      price,
      discount,
      category,
      shop: {
        id: shop._id,
        name: shop.name,
        logo: shop.logo,
      },
    });
    await newProduct.save();

    shop.products.push(newProduct);
    await shop.save();
    return res.status(201).json({
      message: `Product added to ${shop.name} successfully`,
      data: newProduct,
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal Server error" });
  }
});
router.delete("/delete-product", async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: "Id is required" });
    }

    const shop = await Shop.findById(id);
    if (!shop) {
      return res.status(404).json({ error: "Shop not found" });
    }

    const productId = req.body.productId;

    if (!shop.products.includes(productId)) {
      return res.status(404).json({ error: "Product not found" });
    }

    shop.products = shop.products.filter(
      (prod) => prod.toString() !== productId
    );
    await shop.save();
    await Product.findByIdAndDelete(productId);
    return res
      .status(200)
      .json({ message: "Product removed from shop successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});
module.exports = router;
