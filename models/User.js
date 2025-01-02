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
  about: {
    type: String,
    default: "",
  },
  verificationToken: {
    type: String,
    default: "",
  },
  verificationExpires: {
    type: Date,
    default: "",
  },
  subscription: {
    type: String,
    default: "free",
    enum: ["free", "premium"],
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
  onboarding: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    required: true,
    default: "pending",
    enum: ["pending", "verified", "rejected", "deactivated"],
  },
  notification: {
    type: Boolean,
    default: true,
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
