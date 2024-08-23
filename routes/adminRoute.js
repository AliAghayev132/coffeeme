const express = require("express");
const router = express.Router();
const User = require("../schemas/User");
const multer = require("multer");
const Product = require("../schemas/Product");
const Shop = require("../schemas/Shop");

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

//User
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({});
    return res
      .status(200)
      .json({ users, message: "All users returned successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
router.get("/users/premium", async (req, res) => {
  try {
    const users = await User.find({ category: "premium" });
    return res
      .status(200)
      .json({ users, message: "All users returned successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
router.delete("/user/delete", async (req, res) => {
  try {
    const { id } = req.query;
    const user = await User.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ data: user, message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});



//Products
router.get("/products",async (req,res)=>{
  try{
    const products = await Product.find({});
    return res
    .status(201)
    .json({ message: "Product created successfully", data: products });  }catch(error){
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
})
router.post("/product/new/:id", upload.single("photo"), async (req, res) => {
  try {
    const { id } = req.params; // shopId
    const { name, price, discount, category, description, discountType } =
      req.body;

    if (!name || !price || !category || !description || !discountType) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const shop = await Shop.findById(id);
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

    return res
      .status(201)
      .json({ message: "Product created successfully", data: newProduct });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});


module.exports = router;
