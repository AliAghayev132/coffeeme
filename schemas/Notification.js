const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
  title: {
    type: String,
    required: true, // Corrected "require" to "required"
  },
  message: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ["all", "premium"],
  },
  sender: {
    role: {
      type: String,
      enum: ["admin", "partner"],
      required: true,
    },
    id: {
      type: Schema.Types.ObjectId,
      required: function () {
        return this.role === "partner";
      },
    },
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
  },
  rejectionReason: {
    type: String,
    required: function () {
      return this.status === "rejected";
    },
  },
});

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;
