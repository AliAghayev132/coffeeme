const express = require("express");
const router = express.Router();
const User = require("../schemas/User");

//User
router.get("/users/", async (req, res) => {
  try {
    const users = await User.find({});
    return res
      .status(200)
      .json({ data: users, message: "All users returned successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/premium", async (req, res) => {
  try {
    const users = await User.find({ category: "premium" });
    return res
      .status(200)
      .json({ data: users, message: "All users returned successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
//User
router.delete("/user/delete", async (req, res) => {
  try {
    const { id } = req.query;
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
