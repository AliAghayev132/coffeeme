const path = require("path");

const handleFileName = ({ file, newName }) => {
    const fileExtension = path.extname(file.name);
    return newName + "_" + Date.now() + fileExtension;
};
module.exports = {
    handleFileName
}