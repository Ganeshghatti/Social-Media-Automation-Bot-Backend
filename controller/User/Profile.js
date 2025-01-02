const User = require("../../models/User");

exports.Profile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "-password -verificationToken -verificationExpires -resetPasswordToken -resetPasswordExpires"
    );
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: "User not found",
          code: 404,
        },
      });
    }
    res.json({
      success: true,
      message: "User profile fetched successfully",
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: "Internal server error",
        code: 500,
        detail: error.message,
      },
    });
  }
};
