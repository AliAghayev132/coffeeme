const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const subscriberSchema = new Schema({
    fullName: {
        type: String,
        require: true
    },
    email: {
        type: String,
        require: true,
        unique: true,
    },
    date: {
        type: Date,
        default: Date.now(),
    }
});

const Subscriber = mongoose.model("Subscriber", subscriberSchema);
module.exports = Subscriber;