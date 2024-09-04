const express = require("express");
const router = express.Router();
const Partner = require("../../schemas/Partner");
const Order = require("../../schemas/Order");
const validateAccessToken = require("../../middlewares/validateToken");

router.get("/", validateAccessToken, async (req, res) => {
    try {
        const { email } = req.user;
        const partner = await Partner.findOne({ email }).populate("orders");

        if (partner) {
            return res.status(404).json({ success: false, message: "Partner not found" });
        }

        return res.status(200).json({ success: true, message: "All orders got", orders: partner.orders })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
})
router.put("/:id", validateAccessToken, async (req, res) => {

})

module.exports = router;