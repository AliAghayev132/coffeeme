const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const shopSchema = new Schema({});

const Shop = mongoose.model("Shop", shopSchema);
module.exports = Shop;
