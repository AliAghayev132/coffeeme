const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const slideSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    navigateType: {
        type: String,
        required: true,
        enum: ["advert", "shop"],
    },
    image: {
        type: String,
        required: true,
    },
    navigateTarget: { type: Schema.Types.ObjectId, ref: "Shop", default: null }
})

const Slide = mongoose.model("Slide", slideSchema);
module.exports = Slide;