const mongoose = require("mongoose");

const linkedinPostsSchema = new mongoose.Schema({
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
  isPublished: {
    type: Boolean,
    default: false,
  },
  tobePublishedAt: {
    type: Date,
  },
});

const LinkedinPosts = mongoose.model("LinkedinPosts", linkedinPostsSchema);

module.exports = LinkedinPosts;
