const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    target: {
      type: String,
      enum: ["ALL", "CUSTOMERS", "DRIVERS"],
      default: "ALL",
    },
    category: {
      type: String,
      enum: ["FESTIVAL_OFFER", "PROMOTION", "ANNOUNCEMENT", "ALERT", "UPDATE"],
      default: "FESTIVAL_OFFER",
    },
    discountCode: {
      type: String,
      default: "",
      trim: true,
    },
    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    actionUrl: {
      type: String,
      default: "",
      trim: true,
    },
    sentBy: {
      type: String,
      default: "ADMIN",
    },
    recipientCount: {
      type: Number,
      default: 0,
    },
    successCount: {
      type: Number,
      default: 0,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["SENT", "FAILED", "PENDING"],
      default: "SENT",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Notification", notificationSchema);
