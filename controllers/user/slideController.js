const Slide = require("../../schemas/Slide");
const User = require("../../schemas/User");

const getAllSlides = async (req, res) => {
    try {
        const { email } = req.user;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const slides = await Slide.find({});
        return res.status(200).json({ success: true, message: "All data retrieved", slides })
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
}

module.exports = {
    getAllSlides
}