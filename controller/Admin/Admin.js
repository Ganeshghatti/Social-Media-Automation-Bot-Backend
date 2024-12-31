const validator = require("validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userModel = require("../../models/User");

exports.AdminLogin = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // Validate email
    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Please provide a valid email address.",
          code: 400,
          detail: "Email validation failed: Invalid email format."
        },
      });
    }

    const admin = await userModel.findOne({ email, role: "admin" });

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Invalid email or password.",
          code: 401,
          detail: "Authentication failed: Admin user not found."
        },
      });
    }

    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Invalid email or password.",
          code: 401,
          detail: "Authentication failed: Password mismatch."
        },
      });
    }

    const token = jwt.sign(
      { userId: admin._id, email: admin.email },
      process.env.JWTSECRET
    );

    res.status(200).json({
      success: true,
      message: "Login successful.",
      token: token,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: "An internal server error occurred. Please try again later.",
        code: 500,
        detail: error.message,
      },
    });
  }
};