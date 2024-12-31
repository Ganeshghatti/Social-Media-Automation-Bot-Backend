const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    unique: true,
  },
  username: {
    type: String,
    required: true,
  },
  verificationToken: {
    type: String,
    default: "",
  },
  verificationExpires: {
    type: Date,
    default: "",
  },
  role: {
    type: String,
    required: true,
    default: "user",
    enum: ["user", "admin"],
  },
  profilepic: {
    type: String,
    default: "",
  },
  settings: {
    description: {
      type: String,
      default: "",
    },
    keywords: {
      type: [String],
      default: [],
    },
  },
  credentials: {
    twitter: {

    },
  },
  status: {
    type: String,
    required: true,
    default: "pending",
    enum: ["pending", "verified", "rejected", "deactivated"],
  },
  createdAt: {
    type: String,
    required: true,
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
});

const User = mongoose.model("User", userSchema);

module.exports = User;
