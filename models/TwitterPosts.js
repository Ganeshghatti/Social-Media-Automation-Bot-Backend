const mongoose = require("mongoose");

const twitterPostSchema = new mongoose.Schema({
  text: String,
  img: String,
  tobePublishedAt: Date,
  isPublished: Boolean,
  status: {
    type: String,
    enum: ["scheduled", "published", "failed"],
    default: "scheduled"
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("TwitterPost", twitterPostSchema);
