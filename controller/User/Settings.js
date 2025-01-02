const userModel = require("../../models/User");
const putPresignedUrl = require("../../utils/cloud/putPresignedUrl");
const DeleteS3Image = require("../../utils/cloud/DeleteS3Image");
require("dotenv").config();

exports.EditSettings = async (req, res) => {
  try {
    const { username, notification, about, profilepic } = req.body;
    console.log(username, notification, about, profilepic);
    const user = await userModel
      .findById(req.user._id)
      .select(
        "-password -verificationToken -verificationExpires -resetPasswordToken -resetPasswordExpires"
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: "We couldn't find your account.",
          code: 404,
          detail: "User not found",
        },
      });
    }

    // Handle profile picture upload
    let profilepicUrl;
    let presignedUrl;
    if (profilepic && profilepic.originalname) {
      if (user.profilepic) {
        const key = user.profilepic.split(
          `${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`
        )[1];
        await DeleteS3Image(key);
      }
      const fileName = `user/${req.user._id}/profilepic/${Date.now()}-${
        profilepic.originalname
      }`;
      presignedUrl = await putPresignedUrl(fileName);
      profilepicUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    }

    console.log(profilepicUrl);

    if (about !== undefined) user.about = about;
    if (username !== undefined) user.username = username;
    if (notification !== undefined) user.notification = notification;
    if (profilepicUrl) user.profilepic = profilepicUrl;

    await user.save();
    res.status(200).json({
      success: true,
      message: "Your settings have been updated successfully.",
      data: { user, presignedUrl },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: "There was an issue updating your settings. Please try again.",
        code: 500,
        detail: error.message,
      },
    });
  }
};
