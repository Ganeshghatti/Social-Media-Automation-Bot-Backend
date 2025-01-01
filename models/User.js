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
  credentials: {
    twitter: {
      twitterOAuthToken: String,
      twitterOAuthSecret: String,
      accessToken: String,
      accessSecret: String,
      userId: String,
      username: String,
      isConnected: Boolean
    }
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
