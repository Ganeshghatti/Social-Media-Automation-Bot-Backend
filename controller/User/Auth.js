const userModel = require("../../models/User");
const VerificationEmail = require("../../utils/mail/VerificationEmail");
const validator = require("validator");
const moment = require("moment");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const PasswordResetEmail = require("../../utils/mail/PasswordResetEmail");
require('dotenv').config()

exports.Signup = async (req, res, next) => {
  const userdata = req.body;

  try {
    if (!validator.isEmail(userdata.email)) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Please provide a valid email address.",
          code: 400,
        },
      });
    }

    if (!validator.isStrongPassword(userdata.password)) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            "Your password is too weak. It should be at least 8 characters long and include uppercase letters, lowercase letters, numbers, and special characters.",
          code: 400,
        },
      });
    }

    const existingUser = await userModel.findOne({ email: userdata.email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: {
          message: "An account with this email already exists.",
          code: 400,
        },
      });
    }

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

    const newUser = await user.save();

    try {
      await VerificationEmail(
        newUser.email,
        newUser.username,
        newUser.verificationToken
      );
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: "We encountered an issue sending the verification email. Please try again later.",
          code: 500,
        },
      });
    }

    res.status(200).json({
      success: true,
      message:
        "Registration successful! Please check your email to verify your account."
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: "There was a problem creating your account. Please try again.",
        code: 500,
        detail: error.message,
      },
    });
  }
};

exports.VerifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    const user = await userModel.findOne({
      verificationToken: token,
      verificationExpires: { $gt: Date.now() },
      status: "pending",
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        error: {
          message: "The verification token is invalid or has expired.",
          code: 400,
        },
      });
    }

    user.status = "verified";
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Your email has been verified successfully!",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to verify your email. Please try again.",
        code: 500,
        detail: error.message,
      },
    });
  }
};

exports.Login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Please provide a valid email address.",
          code: 400,
        },
      });
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Invalid email or password. Please try again.",
          code: 401,
        },
      });
    }

    if (user.status !== "verified") {
      return res.status(401).json({
        success: false,
        error: {
          message: "Please verify your email before logging in.",
          code: 401,
        },
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Invalid email or password. Please try again.",
          code: 401,
        },
      });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWTSECRET
    );

    res.status(200).json({
      success: true,
      message: "Login successful!",
      data: {
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: "An error occurred during login. Please try again.",
        code: 500,
        detail: error.message,
      },
    });
  }
};

exports.ForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Please provide a valid email address.",
          code: 400,
        },
      });
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: "No account found with this email address.",
          code: 404,
        },
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    try {
      await PasswordResetEmail(user.email, user.username, resetToken);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: "We encountered an issue sending the password reset email. Please try again later.",
          code: 500,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: "A password reset link has been sent to your email.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to process your password reset request. Please try again.",
        code: 500,
        detail: error.message,
      },
    });
  }
};

exports.ResetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!validator.isStrongPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Your new password must be strong and meet the required criteria.",
          code: 400,
        },
      });
    }

    const user = await userModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: {
          message: "The reset token is invalid or has expired.",
          code: 400,
        },
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    user.password = hash;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Your password has been reset successfully!",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to reset your password. Please try again.",
        code: 500,
        detail: error.message,
      },
    });
  }
};
