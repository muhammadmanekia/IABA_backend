const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
    },
    body: {
      type: String,
    },
    topic: {
      type: String,
    },
    screen: {
      type: String,
    },
    eventId: {
      type: String,
      required: false,
    },
    sendAt: { type: Date },
    status: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Notification",
  notificationSchema,
  "notifications"
);
