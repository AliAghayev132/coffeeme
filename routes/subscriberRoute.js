const express = require("express");
const router = express.Router();
const Subscriber = require('../schemas/Subscriber');
const validateAccessToken = require("../middlewares/validateToken");
router.post('/', async (req, res) => {
    try {
        const { email, fullName } = req.body;
        if (!email || !fullName) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }
        const subscriber = new Subscriber({
            email, fullName
        })
        await subscriber.save();
        return res.status(201).json({ success: true, message: "You subscribed" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
})
router.get('/', validateAccessToken, async (req, res) => {
    try {
        const subscribers = await Subscriber.find({});
        return res.status(200).json({ message: "All subcribers fetched", success: true, subscribers });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
})
module.exports = router;
