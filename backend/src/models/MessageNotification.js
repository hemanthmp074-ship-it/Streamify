import mongoose from "mongoose";

const messageNotificationSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    messageId: {
      type: String,
      required: true,
    },
    channelId: {
      type: String,
      required: true,
    },
    messageText: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const MessageNotification = mongoose.model(
  "MessageNotification",
  messageNotificationSchema
);

export default MessageNotification;
