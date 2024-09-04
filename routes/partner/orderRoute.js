const express = require("express");
const router = express.Router();
const Partner = require("../../schemas/Partner");
const Order = require("../../schemas/Order");
const User = require("../../schemas/User");
const validateAccessToken = require("../../middlewares/validateToken");

router.get("/", validateAccessToken, async (req, res) => {
    try {
        const { username } = req.user;

        const partner = await Partner.findOne({ username }).populate({
            path: 'orders',
            populate: {
                path: 'user',
                select: 'firstname secondname email phone' // Add other fields you need here
            }
        });

        if (!partner) {
            return res.status(404).json({ success: false, message: "Partner not found" });
        }
        console.log(partner.orders[0].items);
        const ordersWithUserDetails = partner.orders.map(order => ({
            _id: order._id,
            items: order.items,
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


        return res.status(200).json({ success: true, message: "All orders got", ordersWithUserDetails })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
})
router.put("/:id", validateAccessToken, async (req, res) => {

})

module.exports = router;