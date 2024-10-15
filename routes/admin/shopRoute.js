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
router.post(
  "/",
  validateAccessToken,
  upload.fields([{ name: "logo" }, { name: "photo" }]), // Multer middleware
  async (req, res) => {
    try {
      const { name, longitude, latitude, address, shortAddress } = req.body;

      if (!name || !longitude || !latitude || !address) {
        return res.status(400).json({
          error: "Name, longitude, address and latitude are required",
        });
      }

      const newShop = new Shop({
        shortAddress,
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
router.delete("/:id", validateAccessToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "ID is required" });
    }
    const deletedShop = await Shop.findByIdAndDelete(id);
    if (!deletedShop) {
      return res.status(404).json({ error: "Shop not found" });
    }

    await Partner.findOneAndDelete({ shop: id });
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
  validateAccessToken,
  upload.fields([{ name: "logo" }, { name: "photo" }]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, longitude, latitude, address, shortAddress } = req.body;

      const shop = await Shop.findById(id);
      if (!shop) {
        return res.status(404).json({ error: "Shop not found" });
      }

      const oldDir = `public/uploads/shops/${shop.name}-${shop.address}`;
      if (shortAddress) shop.shortAddress = shortAddress;
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
router.get("/", validateAccessToken, async (req, res) => {
  try {
    const shops = await Shop.find();
    return res.status(201).json({ success: true, shops });
  } catch (error) {
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
module.exports = router;
