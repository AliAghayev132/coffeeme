const express = require("express");
const router = express.Router();
const Partner = require("../../schemas/Partner");
const Order = require("../../schemas/Order");
const User = require("../../schemas/User");
const validateAccessToken = require("../../middlewares/validateToken");

router.get("/", validateAccessToken, async (req, res) => {
    try {
        const { username } = req.user;

        // Find the partner and populate orders with user and product details
        const partner = await Partner.findOne({ username }).populate({
            path: 'orders',
            populate: [
                {
                    path: 'user',
                    select: 'firstname secondname email phone' // Add other fields you need here
                },
                {
                    path: 'items.product',
                    select: 'name category price' // Adjust fields based on your Product schema
                }
            ]
        });

        if (!partner) {
            return res.status(404).json({ success: false, message: "Partner not found" });
        }

        // Create the orders with user and product details
        const ordersWithUserDetails = partner.orders.map(order => ({
            _id: order._id,
            items: order.items.map(item => ({
                _id: item._id,
                product: {
                    name: item.product.name,
                    category: item.product.category,
                    price: item.product.price
                },
                quantity: item.quantity,
                price: item.price,
                discount: item.discount,
                discountedPrice: item.discountedPrice,
                size: item.size
            })),
            shop: order.shop,
            totalPrice: order.totalPrice,
            totalDiscountedPrice: order.totalDiscountedPrice,
            message: order.message,
            createdDate: order.createdDate,
            finishedDate: order.finishedDate,
            status: order.status,
            user: {
                firstname: order.user.firstname,
                secondname: order.user.secondname,
                email: order.user.email,
                phone: order.user.phone,
                _id: order.user._id
            }
        }));

        return res.status(200).json({ success: true, message: "All orders got", orders: ordersWithUserDetails });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
router.put("/:id", validateAccessToken, async (req, res) => {

})

module.exports = router;