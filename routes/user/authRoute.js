const User = require("../../schemas/User");
const Otp = require("../../schemas/Otp");
const bcrypt = require("bcrypt");
const express = require("express");
const router = express.Router();
const multer = require("multer");
const jwt = require("jsonwebtoken");
const path = require("path");
const otpGenerator = require("../../utils/otpGenerator");
const validateAccessToken = require("../../middlewares/validateToken");
const {
  validateEmail,
  validateAzerbaijanPhoneNumber,
  validatePassword,
} = require("../../utils/validation");
const { USERS_CONNECTIONS } = require("../../utils/socket/websokcetUtil");
const checkStreak = require("../../utils/user/checkStreak");
const accountController = require("../../controllers/user/accountController");

const storage = (folderName) =>
  multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname, "..", `public/uploads/${folderName}/`)); // Adjust according to your project structure
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const id = req.user.email || "unknown_user"; // Use the user ID from JWT
      cb(null, id + "-" + uniqueSuffix + path.extname(file.originalname));
    },
  });
const upload = multer({
  storage: storage("profile-photos"),
  limits: { fileSize: 1024 * 1024 * 10 }, // Maximum file size: 10MB
});

// Register
router.post("/send-otp", async (req, res) => {
  const { email, phone } = req.body;

  try {
    if (!validateEmail(email))
      return res
        .status(400)
        .json({ success: false, message: "Email is not valid" });

    if (!validateAzerbaijanPhoneNumber(phone))
      return res
        .status(400)
        .json({ success: false, message: "Phone Number is not valid" });

    const [existingUser, existingOtp] = await Promise.all([
      User.findOne({ $or: [{ email }, { phone }] }),
      Otp.findOneAndDelete({ email }),
    ]);

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message:
          existingUser.email === email
            ? "Email already exists"
            : "Phone Number already exists",
      });
    }

    let otp = await otpGenerator();

    const newOtp = await Otp.create({ email, otp, phone });
    return res.status(200).json({
      success: true,
      createdAt: newOtp.createdAt,
      message: "OTP sent successfully",
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});
router.post("/verify-otp", async (req, res) => {
  try {
    const {
      email,
      phone,
      birthDate,
      gender,
      password,
      otp,
      firstname,
      secondname,
    } = req.body;
    if (!phone || !email || !birthDate || !gender || !otp) {
      return res.status(400).json({
        error: "All fields are required",
      });
    }
    if (!validatePassword(password)) {
      return res
        .status(400)
        .json({ success: false, message: "Your password is not valid" });
    }
    const existingEmail = await Otp.findOne({ email });

    if (!existingEmail)
      return res.status(400).json({
        error: "No time left for otp",
      });

    if (existingEmail.phone !== phone) {
      return res.status(400).json({
        sucess: false,
        message: "Your registered phone number is different",
      });
    }

    if (existingEmail.otp !== otp) {
      return res
        .status(400)
        .json({ sucess: false, message: "Your otp is not valid" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = User({
      firstname,
      secondname,
      phone,
      email,
      birthDate,
      gender,
      password: hashedPassword,
    });

    await newUser.save();
    await Otp.deleteOne({ email });
    return res
      .status(201)
      .json({ success: true, message: "User registered successfully" });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});
// Change Password
//! Bitir
router.put("/change-password", validateAccessToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const { email } = req.user;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ sucess: false, message: "User not found" });
    }

    if (oldPassword === newPassword) {
      return res.status(400).json({
        sucess: false,
        message: "Old password and new password cannot be the same",
      });
    }

    if (!validatePassword(newPassword)) {
      return res
        .status(400)
        .json({ sucess: false, message: "New password is not valid" });
    }

    const isOldPasswordValid = bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      return res
        .status(400)
        .json({ sucess: false, message: "Old password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    return res
      .status(200)
      .json({ success: true, message: "Password successfully changed" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
// Forgot Password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const [existingUser, existingOtp] = await Promise.all([
      User.findOne({ email }),
      Otp.findOne({ email }),
    ]);

    if (!existingUser) {
      return res.status(400).json({ sucess: false, message: "User not found" });
    }

    let otp = await otpGenerator();
    let newOtp = await Otp.create({ email, otp, phone: existingUser.phone });
    return res.status(200).json({
      sucess: true,
      message: "Otp sent successfully",
      createdAt: newOtp.createdAt,
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Internal server error" });
  }
});
router.post("/forgot-password-otp-confirm", async (req, res) => {
  try {
    const { otp, email } = req.body;
    const [existingUser, existingOtp] = await Promise.all([
      User.findOne({ email }),
      Otp.findOne({ otp }),
    ]);

    if (!existingUser)
      return res.status(400).json({ sucess: false, message: "User not found" });

    if (!existingOtp)
      return res.status(400).json({ sucess: false, message: "Invalid OTP" });

    if (existingOtp.email !== email)
      return res
        .status(400)
        .json({ sucess: false, message: "Email is different" });

    return res
      .status(200)
      .json({ sucess: true, message: "Otp is successfully delivered" });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "Internal server error" });
  }
});
router.post("/forgot-password-confirm", async (req, res) => {
  try {
    const { otp, email, password } = req.body;

    if (!validatePassword(password)) {
      return res
        .status(400)
        .json({ sucess: false, message: "Password is not valid" });
    }

    const [existingUser, existingOtp] = await Promise.all([
      User.findOne({ email }),
      Otp.findOne({ otp }),
    ]);

    if (!existingUser) {
      return res.status(400).json({ sucess: false, message: "User not found" });
    }

    if (!existingOtp) {
      return res.status(400).json({ sucess: false, message: "Invalid OTP" });
    }

    if (existingOtp.email !== email) {
      return res
        .status(400)
        .json({ sucess: false, message: "Email is different" });
    }

    const passwordMatch = await bcrypt.compare(password, existingUser.password);
    if (passwordMatch) {
      return res
        .status(400)
        .json({ error: "Your new password is the same as the old password" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    existingUser.password = hashedPassword;

    await existingUser.save();
    await Otp.deleteOne({ otp });
    return res
      .status(200)
      .json({ sucess: true, message: "Password reset successfully" });
  } catch (error) {
    console.error("Error during password reset:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
// Login
router.post("/login", async (req, res) => {
  try {
    const { password, email } = req.body;
    const user = await User.findOne({ email }).lean();
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    delete user.password;
    delete user.__v;
    const accessToken = jwt.sign(
      {
        email,
      },
      process.env.ACCESS_SECRET_KEY,
      {
        expiresIn: "10m",
      }
    );
    const refreshToken = jwt.sign(
      {
        email,
      },
      process.env.REFRESH_SECRET_KEY,
      {
        expiresIn: 24 * 60 * 60 * 15,
      }
    );

    USERS_CONNECTIONS[user._id] = null;

    return res.status(200).json({ refreshToken, accessToken, user });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: "Internal server error" });
  }
});
router.post("/update-fingertips", validateAccessToken, async (req, res) => {
  try {
    const { fingerTips } = req.body;
    const { email } = req.user;
    if (!fingerTips) {
      return res
        .status(400)
        .json({ success: false, message: "FingerTips are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    if (!user.fingerTips) {
      user.fingerTips = fingerTips;
      await user.save();
      return res.status(200).json({
        success: true,
        message: "FingerTips updated successfully",
        fingerTips: user.fingerTips,
      });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "FingerTips already set" });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal Server error" });
  }
});

// Refresh Access Token
router.post("/refresh-token", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const decoded = jwt.verify(token, process.env.REFRESH_SECRET_KEY);
    const { email } = decoded;
    // Yeni access token oluştur
    const newToken = jwt.sign({ email }, process.env.ACCESS_SECRET_KEY, {
      expiresIn: "10m",
    });
    return res.status(200).json({ accessToken: newToken });
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Unauthorized" });
  }
});
router.get("/user", validateAccessToken, async (req, res) => {
  try {
    const { email } = req.user;
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User Not found" });
    }
    if (!checkStreak({ streak: user.streak })) {
      user.streak = {
        count: 0,
      };
      await user.save();
    }

    user.password = undefined;
    user.__v = undefined;

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "An error occurred while retrieving user information.",
    });
  }
});
// Account Updates
router.post(
  "/upload-image",
  validateAccessToken, // Middleware to validate JWT and extract user info
  accountController.uploadProfilePhoto
);
router.post("/edit-account", validateAccessToken, async (req, res) => {
  try {
    const { email } = req.user;
    const data = req.body;
    const user = await User.findOneAndUpdate(
      { email },
      { ...data },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    user.password = undefined;
    return res.status(200).json({ message: "User successfullt edited", user });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Internal server error" });
  }
});

module.exports = router;
