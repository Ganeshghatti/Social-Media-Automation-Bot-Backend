const WorkSpace = require("../../models/WorkSpace");
const User = require("../../models/User");
const moment = require("moment");
require('dotenv').config()

exports.OnBoarding = async (req, res) => {
  const { keywords, description } = req.body;

  try {
    const existingWorkspace = await WorkSpace.findOne({ userId: req.user._id });
    if (existingWorkspace) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Workspace already exists for this user",
          code: 400
        }
      });
    }

    const workspace = new WorkSpace({
      name: "default Workspace",
      about: "",
      userId: req.user._id,
      settings: {
        description: description || "",
        keywords: keywords || []
      },
      createdAt: moment().format(),
      connectedAccounts: []
    });

    await workspace.save();

    // Update user's onboarding status
    const user = await User.findById(req.user._id);
    user.onboarding = true;
    await user.save();

    res.status(201).json({
      success: true,
      message: "Workspace created successfully",
      data: workspace
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to create workspace",
        code: 500,
        detail: error.message
      }
    });
  }
};
