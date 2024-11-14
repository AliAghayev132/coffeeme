const Partner = require("../../schemas/Partner");

const updateStockStatus = async (req, res) => {
  try {
    const { username } = req.user;
    const { id } = req.params;
    const { status } = req.body;

    const partner = await Partner.findOne({ username }).populate({
      path: "shop",
      populate: {
        path: "products",
      },
    });
    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });
    }

    const existProduct = partner.shop.products.find(
      (product) => product._id.toString() === id
    );
    
    if (!existProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
      ƒ;
    }

    existProduct.stock = status;
    await existProduct.save();
    res
      .status(200)
      .json({ success: true, existProduct, message: "Product stock updated" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const { username } = req.user;
    const partner = await Partner.findOne({ username }).populate({
      path: "shop",
      populate: {
        path: "products",
      },
    });

    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });
    }

    return res.status(200).json({
      success: true,
      products: partner.shop.products,
      shop: {
        _id: partner.shop._id,
        percentage: partner.shopPercentage,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { updateStockStatus, getAllProducts };
