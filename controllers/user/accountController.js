// Models
const User = require("../../schemas/User");
// Services
const { FileControlService } = require("../../services/FileControlService");
const { FileUploadService } = require("../../services/FileUploadService");
// Path
const { ProfilePhotoPath } = require("../../constants/paths");
const { handleFileName } = require("../../utils/core/handleFileName");

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
    const uploadedFile = req.files?.photo;
    if (uploadedFile) {
      uploadedFile.name = handleFileName({ file: uploadedFile, newName: user._id });
      await FileUploadService.Upload({ file: uploadedFile, uploadPath: `${ProfilePhotoPath}` })
      if (user.image) {
        FileControlService.Delete({ filePath: `${ProfilePhotoPath}/${user.image}` });
      }
      user.image = uploadedFile.name;
    } else {
      return res.status(404).json({ success: false, message: "Uploaded file not found" })
    }

    await user.save();
    return res
      .status(201)
      .json({ success: true, message: "Photo Updated Successfully" });

  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { uploadProfilePhoto };
