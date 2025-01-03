const mongoose = require("mongoose");

const instagramPostsSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  img: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    default: "draft",
    enum: ["draft", "scheduled", "published"],
  },
  isPublished: {
    type: Boolean,
    default: false,
  },
  tobePublishedAt: {
    type: Date,
  },
});

const InstagramPosts = mongoose.model("InstagramPosts", instagramPostsSchema);

module.exports = InstagramPosts;
