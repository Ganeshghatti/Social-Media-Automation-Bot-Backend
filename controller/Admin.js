const validator = require("validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userModel = require("../models/User");
const postModel = require("../models/Posts");

exports.AdminLogin = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // Validate email
    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({
        error: "Please provide a valid email address.",
      });
    }

    const admin = await userModel.findOne({ email });

    if (!admin) {
      return res.status(401).json({
        error: "Invalid email or password.",
      });
    }

    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      return res.status(401).json({
        error: "Invalid email or password.",
      });
    }

    const token = jwt.sign(
      { userId: admin._id, email: admin.email },
      process.env.ADMINJWTSECRET
    );

    res.status(200).json({
      message: "Login successful.",
      token: token,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: "An internal server error occurred. Please try again later.",
    });
  }
};

exports.GetAllPosts = async (req, res, next) => {
  try {
    const posts = await postModel.find();
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({
      error: "Failed to retrieve posts. Please try again later.",
    });
  }
};
