const User = require("../../models/User");
const getPresignedUrl = require("../../utils/cloud/getPresignedUrl");

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
    if (user.profilepic) {
      const key = user.profilepic.split(
        `${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`
      )[1];
      user.profilepic = await getPresignedUrl(key);
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
