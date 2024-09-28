const express = require("express");
const router = express.Router();
// Utils
const validateAccessToken = require("../../middlewares/validateToken");
// Models
const User = require("../../schemas/User");

// Route to get all historical (completed/canceled) orders for the authenticated user
router.get("/history", validateAccessToken, async (req, res) => {
  try {
    const { email } = req.user;

    // Find the user by email and populate the 'history' field with related Order details
    const user = await User.findOne({ email }).populate({
      path: "history",
      populate: [
        {
          path: "items.product", // Populate product details in each order
          select: "name price photo", // Select specific fields from the Product schema
        },
        {
          path: "shop", // Populate shop details for each order
          select: "name logo address", // Select specific fields from the Shop schema
        },
      ],
      select: "status totalPrice totalDiscountedPrice items shop statusHistory", // Fields to retrieve from the Order schema
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Return the user's historical orders with product and shop details populated
    return res.status(200).json({
      success: true,
      history: user.history, // Completed/canceled orders
    });
  } catch (error) {
    console.error("Error fetching history orders:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
