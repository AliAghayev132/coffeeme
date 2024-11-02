const express = require("express");
const validateAccessToken = require("../../middlewares/validateToken");
const router = express.Router();
const Partner = require("../../schemas/Partner");
    
router.get("/history", validateAccessToken, async (req, res) => {
    try {
        const { username } = req.user;
        const partner = await Partner.findOne({ username }).populate({
            path: 'history',
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
        })
        if (!partner) {
            return res.status(404).json({ success: false, message: "Partner not found" });
        }

        return res.status(200).json({ success: true, message: "All history delivered", history: partner.history })

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
})
module.exports = router;