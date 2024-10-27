const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const WithdrawPartnerSchema = new Schema({
  amount: {
    type: Number,
    required: true, 
  },
  partner: { 
    type: Schema.Types.ObjectId, 
    ref: "Partner",
    required: true
  },
  createdDate: {
    type: Date,
    default: Date.now,
  },
  modifiedDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["pending", "rejected", "completed"],
    default: "pending",
  },
  rejectedReason: {
    type: String,
    required: function() {
      return this.status === "rejected";
    },
  },
});

const WithdrawPartner = mongoose.model("WithdrawPartner", WithdrawPartnerSchema);
module.exports = WithdrawPartner;