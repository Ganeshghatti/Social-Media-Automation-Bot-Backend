const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Workspace",
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ["instagram", "twitter", "linkedin"],
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const Post = mongoose.model("Post", postSchema);

module.exports = Post;