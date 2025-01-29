// Schemas
const Slide = require("../../schemas/Slide");
const Admin = require("../../schemas/Admin");
// Services
const { FileUploadService } = require("../../services/FileUploadService");
// Path
const { SlidePhotoPath } = require("../../constants/paths");
// Utils
const { handleFileName } = require("../../utils/core/handleFileName");
const { FileControlService } = require("../../services/FileControlService");


const getAllSlides = async (req, res) => {
    try {
        const { email } = req.user;
        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(404).json({ success: false, message: "Admin not found" });
        }

        const slides = await Slide.find({});
        return res.status(200).json({ success: true, message: "All data retrieved", slides })
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
}
const addNewSlide = async (req, res) => {
    try {
        const { email } = req.user;
        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(404).json({ success: false, message: "Admin not found" });
        }
        const uploadedFile = req.files?.photo;

        if (!uploadedFile) {
            return res.status(404).json({ message: "Photo not found" });
        }

        uploadedFile.name = handleFileName({ file: uploadedFile, newName: Date.now() })
        await FileUploadService.Upload({ file: uploadedFile, uploadPath: `${SlidePhotoPath}` })

        const { title, description, navigateType, navigateTarget } = req.body;

        if (!title || !description || !navigateType) {
            return res.status(400).json({ message: "All fields are required", success: false });
        }
        

        if (navigateType == "shop") {
            if (!navigateTarget) {
                return res.status(400).json({ message: "navigateTarget field is required", success: false });
            }
        }

        
        const newSlide = await Slide.create({
            title,
            description,
            navigateType,
            navigateTarget,
            image: uploadedFile.name,
        });


        return res.status(201).json({ message: "New slide created", newSlide, success: true });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
const deleteSlide = async (req, res) => {
    try {
        const { email } = req.user;
        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(404).json({ success: false, message: "Admin not found" });
        }

        const { _id } = req.user;

        const deletedSlide = await Slide.deleteOne({ _id });
        FileControlService.Delete({ filePath: `${SlidePhotoPath}/${deletedSlide.image}` })

        return res.status(200).json({
            message: "Slide deleted successfully",
            success: true
        })

    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
}

module.exports = {
    addNewSlide,
    deleteSlide,
    getAllSlides,
}