// Models
const User = require("../../schemas/User");

// Search Methods
const removeFromRecent = async (req, res) => {
    console.log("removeFromRecent");
    
    try {
        // Params
        const { email } = req.user;
        const { itemId, itemType } = req.body;

        // User check
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });


        // Product and Shop check
        if (!["Shop", "Product"].includes(itemType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid item type. Must be either 'Shop' or 'Product'.",
            });
        }

        const fixedItemType = `${itemType.toLowerCase()}s`;
        user.recentSearched[fixedItemType] = user.recentSearched[fixedItemType].filter(
            item => item.item.toString() !== itemId
        );

        await user.save();

        return res.status(200).json({ message: "Item removed from recent searcies", success: true })
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }


}


module.exports = {
    removeFromRecent
}