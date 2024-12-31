const userModel = require("../../models/User");
const dotenv = require("dotenv");
const UploadUserImg = require("../../utils/cloud/UploadUserImg");
const DeleteUserImg = require("../../utils/cloud/DeleteUserImg");

const envFile = process.env.SOCIAL_MEDIA_ENV;
dotenv.config({ path: envFile });

exports.EditSettings = async (req, res) => {
  try {
    const { keywords, description, username } = req.body;

    const keywordsArray = JSON.parse(keywords);
    // Assuming keywords is already an array
    if (!Array.isArray(keywordsArray)) {
      return res.status(400).json({ error: "Keywords must be an array." });
    }
    const user = await userModel.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
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
    res.status(200).json({ message: "Settings updated successfully" });
  } catch (error) {
    console.error("Error updating settings:", error);
    res
      .status(500)
      .json({ error: "An error occurred while updating settings" });
  }
};

exports.GetSettings = async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user settings:", error);
    res.status(500).json({ error: "Failed to fetch user settings" });
  }
};
