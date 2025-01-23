const fs = require("fs");
class FileUploadService {
    static async Upload({ file, uploadPath }) {
        try {
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true })
            }
            await file.mv(`${uploadPath}/${file.name}`);
        } catch (error) {
            throw error;
        }
    }
}
module.exports = {
    FileUploadService
};