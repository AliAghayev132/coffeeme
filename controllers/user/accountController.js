const multer = require("multer");
const User = require("../../schemas/User");
const path = require("path");
const fs = require("fs");

const storage = (folderName) =>
  multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, `public/uploads/${folderName}/`);
    },
    filename: function (req, file, cb) {
      cb(null, req.user._id + Math.random() + path.extname(file.originalname));
    },
});

const upload = multer({
  storage: storage("profile-photos"),
  limits: { fileSize: 1024 * 1024 * 10 }, // Maksimum dosya boyutu: 10MB
}).single("photo");

const uploadProfilePhoto = async (req, res) => {
  try {
    const { email } = req.user;
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }
    req.user._id = user._id;
    const oldImagePath = `public/uploads/profile-photos/${user.image}`;
    if (user.image && fs.existsSync(oldImagePath)) {
      fs.unlinkSync(oldImagePath);
    }
    upload(req, res, async (err) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "File upload error" });
      }
      // Yükleme başarılıysa, dosya yolu
      const imagePath = req.file.filename; // Dosya adını al
      user.image = imagePath; // Kullanıcının görüntüsünü güncelle
      await user.save(); // Kullanıcıyı kaydet
      user.password = undefined; // Şifreyi gizle
      return res
        .status(201)
        .json({ success: true, message: "Photo Updated Successfully", user });
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { uploadProfilePhoto };
