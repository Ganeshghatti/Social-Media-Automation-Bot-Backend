const WorkSpace = require("../../../models/WorkSpace");
const User = require("../../../models/User");
const TwitterPost = require("../../../models/TwitterPosts");
const LinkedinPost = require("../../../models/LinkedinPosts");
const InstagramPost = require("../../../models/InstagramPosts");
const checkWorkspaceOwnership = require("../../../utils/checkWorkspaceOwnership");
const DeleteWorkSpaceImg = require("../../../utils/cloud/DeleteWorkSpaceImg");
const UploadWorkSpaceImg = require("../../../utils/cloud/UploadWorkSpaceImg");
const moment = require("moment");

// Helper function to filter out sensitive credentials
function filterWorkspaceData(workspace) {
  const workspaceObj = workspace.toObject();
  if (workspaceObj.connectedAccounts) {
    workspaceObj.connectedAccounts = workspaceObj.connectedAccounts.map(
      (account) => ({
        type: account.type,
        isConnected: account.isConnected,
        username: account.credentials?.username,
        userId: account.credentials?.userId,
      })
    );
  }
  return workspaceObj;
}

exports.CreateWorkSpace = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { name, description, settings } = req.body;
    let iconUrl = "";
    let settingsObj;

    if (!settings) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Keywords and description are required",
          code: 400,
        },
      });
    }
    settingsObj = JSON.parse(settings);

    if (!name || !settingsObj.keywords || !settingsObj.description) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Workspace name, keywords, and description are required",
          code: 400,
        },
      });
    }

    if (user.subscription === "free") {
      const workspaceCount = await WorkSpace.countDocuments({
        userId: req.user._id,
      });
      if (workspaceCount >= 1) {
        return res.status(403).json({
          success: false,
          error: {
            message: "Free tier users can only create one workspace",
            code: 403,
          },
        });
      }
    }

    // Handle icon upload
    if (req.file) {
      const fileName = `workspace-icon-${Date.now()}-${req.file.originalname}`;
      iconUrl = await UploadWorkSpaceImg(
        req.file.buffer,
        fileName,
        "workspace-icons"
      );
    }

    const workspace = new WorkSpace({
      userId: req.user._id,
      name,
      description,
      settings: {
        keywords: settingsObj.keywords,
        description: settingsObj.description,
      },
      icon: iconUrl,
      createdAt: moment().format(),
    });

    await workspace.save();

    res.json({
      success: true,
      message: "Workspace created successfully",
      data: filterWorkspaceData(workspace),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to create workspace. Please try again later.",
        code: 500,
        detail: error.message,
      },
    });
  }
};

exports.GetWorkSpaceById = async (req, res) => {
  try {
    const workspace = await checkWorkspaceOwnership(
      req.params.workSpaceId,
      req.user._id
    );
    if (!workspace) {
      return res.status(403).json({
        success: false,
        error: {
          message: "You don't have access to this workspace",
          code: 403,
        },
      });
    }

    res.json({
      success: true,
      message: "Workspace fetched successfully",
      data: filterWorkspaceData(workspace),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to get workspace. Please try again later.",
        code: 500,
        detail: error.message,
      },
    });
  }
};

exports.GetWorkSpaces = async (req, res) => {
  try {
    const workspaces = await WorkSpace.find({ userId: req.user._id });

    const filteredWorkspaces = workspaces.map((workspace) =>
      filterWorkspaceData(workspace)
    );

    res.json({
      success: true,
      message: "Workspaces fetched successfully",
      data: filteredWorkspaces,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to get workspaces. Please try again later.",
        code: 500,
        detail: error.message,
      },
    });
  }
};

exports.DeleteWorkSpace = async (req, res) => {
  try {
    const workspaceId = req.params.workSpaceId;

    const workspace = await checkWorkspaceOwnership(workspaceId, req.user._id);
    if (!workspace) {
      return res.status(403).json({
        success: false,
        error: {
          message: "You don't have access to this workspace",
          code: 403,
        },
      });
    }

    // Delete workspace icon if exists
    if (workspace.icon) {
      await DeleteWorkSpaceImg(workspace.icon);
    }

    // Delete all associated posts and their images
    const [twitterPosts, linkedinPosts, instagramPosts] = await Promise.all([
      TwitterPost.find({ workspaceId }),
      LinkedinPost.find({ workspaceId }),
      InstagramPost.find({ workspaceId }),
    ]);

    // Delete images from storage
    const deleteImagePromises = [
      ...twitterPosts
        .filter((post) => post.img)
        .map((post) => DeleteWorkSpaceImg(post.img)),
      ...linkedinPosts
        .filter((post) => post.img)
        .map((post) => DeleteWorkSpaceImg(post.img)),
      ...instagramPosts
        .filter((post) => post.img)
        .map((post) => DeleteWorkSpaceImg(post.img)),
    ];

    await Promise.all(deleteImagePromises);

    // Delete all posts
    await Promise.all([
      TwitterPost.deleteMany({ workspaceId }),
      LinkedinPost.deleteMany({ workspaceId }),
      InstagramPost.deleteMany({ workspaceId }),
    ]);

    // Delete workspace
    await WorkSpace.findByIdAndDelete(workspaceId);

    res.json({
      success: true,
      message: "Workspace and associated data deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to delete workspace",
        code: 500,
        detail: error.message,
      },
    });
  }
};

exports.EditWorkSpace = async (req, res) => {
  try {
    const workspaceId = req.params.workSpaceId;
    const { name, description, settings } = req.body;
    let settingsObj;
    if (settings) {
      settingsObj = JSON.parse(settings);
    }

    const workspace = await checkWorkspaceOwnership(workspaceId, req.user._id);
    if (!workspace) {
      return res.status(403).json({
        success: false,
        error: {
          message: "You don't have access to this workspace",
          code: 403,
        },
      });
    }

    // Validate name
    if (name && name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Workspace name cannot be empty",
          code: 400,
        },
      });
    }

    // Handle icon update
    if (req.file) {
      // Delete old icon if exists
      if (workspace.icon) {
        await DeleteWorkSpaceImg(workspace.icon);
      }
      const fileName = `icon-${Date.now()}-${req.file.originalname}`;
      workspace.icon = await UploadWorkSpaceImg(
        req.file.buffer,
        fileName,
        "workspace-icons"
      );
    }

    if (name) workspace.name = name;
    if (description !== undefined) workspace.description = description;
    if (settingsObj) {
      workspace.settings = {
        ...workspace.settings,
        ...settingsObj,
      };
    }

    await workspace.save();

    res.json({
      success: true,
      message: "Workspace updated successfully",
      data: filterWorkspaceData(workspace),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to update workspace",
        code: 500,
        detail: error.message,
      },
    });
  }
};
