const userModel = require("../../models/User");
const UploadUserImg = require("../../utils/cloud/UploadUserImg");
const DeleteUserImg = require("../../utils/cloud/DeleteUserImg");

exports.EditSettings = async (req, res) => {
  try {
    const { keywords, description, username } = req.body;

    const keywordsArray = JSON.parse(keywords);

    if (!Array.isArray(keywordsArray)) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Please provide keywords.",
          code: 400,
        },
      });
    }
    const user = await userModel.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: "We couldn't find your account.",
          code: 404,
        },
      });
    }

    // Handle profile picture upload
    if (req.files && req.files.profilepic && req.files.profilepic.length > 0) {
      if (user.profilepic) {
        await DeleteUserImg(user.profilepic);
      }
      user.profilepic = await UploadUserImg(
        req.files.profilepic[0].buffer,
        req.files.profilepic[0].originalname,
        req.user._id
      );
    }

    // Update other settings
    user.settings.description = description;
    user.settings.keywords = keywordsArray;
    user.username = username;

    await user.save();
    res.status(200).json({
      success: true,
      message: "Your settings have been updated successfully.",
    });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        error: {
          message: "There was an issue updating your settings. Please try again.",
          code: 500,
          detail: error.message,
        },
      });
  }
};

exports.GetSettings = async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: "We couldn't find your account.",
          code: 404,
        },
      });
    }
    res.status(200).json({
      success: true,
      message: "Your settings have been retrieved successfully.",
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to retrieve your settings. Please try again later.",
        code: 500,
        detail: error.message,
      },
    });
  }
};
