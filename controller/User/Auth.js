const userModel = require("../../models/User");
const dotenv = require("dotenv");
const VerificationEmail = require("../../utils/mail/VerificationEmail");
const validator = require("validator");
const moment = require("moment");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const PasswordResetEmail = require("../../utils/mail/PasswordResetEmail");

const envFile = process.env.SOCIAL_MEDIA_ENV;
dotenv.config({ path: envFile });

exports.Signup = async (req, res, next) => {
  const userdata = req.body;

  try {
    if (!validator.isEmail(userdata.email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }
    if (!validator.isStrongPassword(userdata.password)) {
      return res.status(400).json({
        error:
          "Weak password. Must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.",
      });
    }

    const existingUser = await userModel.findOne({ email: userdata.email });

    // If user exists and not in draft mode
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Create new user
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(userdata.password, salt);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const user = new userModel({
      username: userdata.username,
      email: userdata.email,
      phone: userdata.phone,
      password: hash,
      status: "pending",
      verificationToken,
      verificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: moment(),
    });
    console.log(verificationToken);
    const newUser = await user.save();

    try {
      await VerificationEmail(
        newUser.email,
        newUser.username,
        newUser.verificationToken
      );
    } catch (error) {
      res.status(500).json({ error: "Failed to send verification email" });
    }

    res.status(200).json({
      message:
        "Registration successful. Please check your email to verify your account.",
      email: newUser.email,
      username: newUser.username,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Failed to register user" });
  }
};

exports.VerifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    console.log(token);
    const user = await userModel.findOne({
      verificationToken: token,
      verificationExpires: { $gt: Date.now() },
      status: "pending",
    });
    console.log(user);
    if (!user) {
      return res
        .status(400)
        .json({ error: "Invalid or expired verification token" });
    }

    // Update user status and clear verification fields
    user.status = "verified";
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ error: "Failed to verify email" });
  }
};

exports.Login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (user.status !== "verified") {
      return res.status(401).json({ error: "Please verify your email first" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWTSECRET
    );

    res.status(200).json({
      message: "Login successful",
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "An error occurred during login" });
  }
};

exports.ForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    try {
      await PasswordResetEmail(user.email, user.username, resetToken);
    } catch (error) {
      res.status(500).json({ error: "Failed to send password reset email" });
    }

    res.status(200).json({
      message: "Password reset link has been sent to your email",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Failed to process password reset request" });
  }
};

exports.ResetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!validator.isStrongPassword(newPassword)) {
      return res.status(400).json({
        error:
          "Password must be at least 8 characters long and include uppercase, lowercase, number and special character",
      });
    }

    const user = await userModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    user.password = hash;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password has been reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
};
