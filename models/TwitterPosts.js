const mongoose = require("mongoose");

const twitterPostSchema = new mongoose.Schema(
  {
    content: String,
    media: [String],
    tobePublishedAt: Date,
    isPublished: Boolean,
    status: {
      type: String,
      enum: ["scheduled", "published", "failed"],
      default: "scheduled",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    createdAt: {
      type: Date,
    },
    updatedAt: {
      type: Date,
    },
  },
);

module.exports = mongoose.model("TwitterPost", twitterPostSchema);
