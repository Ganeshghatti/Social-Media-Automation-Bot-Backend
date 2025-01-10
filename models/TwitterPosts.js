const mongoose = require("mongoose");

const twitterPostSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Workspace",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ["post", "thread", "reply", "poll"],
  },
  media: {
    type: [String],
    default: [],
  },
  content: {
    type: String,
    required: true,
  },
  tobePublishedAt: {
    type: Date,
    required: true,
  },
  isPublished: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ["scheduled", "published", "failed"],
    default: "scheduled",
  },
  threadId: {
    type: String,
  },
  previousPost: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TwitterPost",
  },
  nextPost: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TwitterPost",
  },
  threadPosition: {
    type: Number,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("TwitterPost", twitterPostSchema);
