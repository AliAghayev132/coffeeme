const fs = require("fs");

class FileControlService {
    static Delete({ filePath }) {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
        } else {
            console.warn(`FileControlService: ${filePath} is not exists.`)
        }
    }
}
module.exports = {
    FileControlService
};