const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const adminSchema = new Schema({
  username: {
    type: String,
    require: true,
    unique: true,
  },
  email: {
    type: String,
    require: false,
    unique: true,
  },
  password: {
    type: String,
    require: true,
  },
  role:{
    type:String,
    default:"admin",
  },
});

const Admin = mongoose.model("Admin", adminSchema);
module.exports = Admin;
