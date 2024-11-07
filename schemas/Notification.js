const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
  title: {
    type: String,
    required: true, // Düzeltme: "require" yerine "required"
  },
  message: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: [
      "allUsers",
      "premiumUsers",
      "freeUsers",
      "allCustomers",
      "subscribers",
    ],
    required: true, // Kategori zorunlu hale getirildi
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
    username: {
      type: String,
      required: function () {
        return this.role === "partner";
      },
    },
  },
  status: {
    type: String,
    enum: ["pending", "published", "rejected"],
    default: "pending",
  },
  rejectionReason: {
    type: String,
    required: function () {
      return this.status === "rejected";
    },
  },
  date: {
    type: Date,
    default: Date.now, // Varsayılan olarak şu anki tarih
  },
  statusHistory: [
    {
      status: {
        type: String,
        enum: ["pending", "published", "rejected"],
        required: true,
      },
      date: {
        type: Date,
        default: Date.now, // Her durum değişikliği için tarih
      },
    },
  ],
});

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;
