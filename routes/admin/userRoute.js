const express = require("express");
const router = express.Router();
const User = require("../../schemas/User");

router.get("/", async (req, res) => {
    try {
      const users = await User.find({}).lean();
      return res
        .status(200)
        .json({ users, message: "All users returned successfully" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
router.get("/premium", async (req, res) => {
  try {
    const users = await User.find({ category: "premium" });
    return res
      .status(200)
      .json({ users, message: "All users returned successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
router.delete("/:id", async (req, res) => {
  try {
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

module.exports = router;
