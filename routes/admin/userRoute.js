const express = require("express");
const router = express.Router();
const User = require("../../schemas/User");
const validateAccessToken = require("../../middlewares/validateToken");
const Admin = require("../../schemas/Admin");

router.get("/", validateAccessToken, async (req, res) => {
  try {
    const { email } = req.user;
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res
        .status(400)
        .json({ success: false, message: "Admin not found" });
    }
    const users = await User.find({}).lean();
    return res
      .status(200)
      .json({ users, message: "All users returned successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
router.get("/premium", validateAccessToken, async (req, res) => {
  try {
    const { email } = req.user;
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res
        .status(400)
        .json({ success: false, message: "Admin not found" });
    }
    const users = await User.find({ category: "premium" });
    return res
      .status(200)
      .json({ users, message: "All users returned successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
router.delete("/:id", validateAccessToken, async (req, res) => {
  try {
    const { email } = req.user;
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res
        .status(400)
        .json({ success: false, message: "Admin not found" });
    }
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ data: user, message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
router.put("/premium", validateAccessToken, async (req, res) => {
  try {
    const { email, category = "standard" } = req.user;
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res
        .status(400)
        .json({ success: false, message: "Admin not found" });
    }
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }

    user.category = category;
    await user.save();
    return res
      .status(200)
      .json({ success: true, message: "User subscription upgraded" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
