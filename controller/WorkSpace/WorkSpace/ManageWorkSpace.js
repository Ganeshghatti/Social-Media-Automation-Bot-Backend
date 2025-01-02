const WorkSpace = require("../../../models/WorkSpace");
const User = require("../../../models/User");
const TwitterPost = require("../../../models/TwitterPosts");
const LinkedinPost = require("../../../models/LinkedinPosts");
const InstagramPost = require("../../../models/InstagramPosts");
const checkWorkspaceOwnership = require("../../../utils/checkWorkspaceOwnership");
const moment = require("moment");
const putPresignedUrl = require("../../../utils/cloud/putPresignedUrl");
const getPresignedUrl = require("../../../utils/cloud/getPresignedUrl");
const DeleteS3Image = require("../../../utils/cloud/DeleteS3Image");

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
    const { name, about, settings, icon } = req.body;
    let iconUrl = "";
    let presignedUrl;

    if (!settings) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Description and keywords are required",
          code: 400,
        },
      });
    }

    if (!name || !settings.keywords || !settings.description) {
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

    // Create the workspace first to get the workspace ID
    const workspace = new WorkSpace({
      userId: req.user._id,
      name,
      about,
      settings: {
        keywords: settings.keywords,
        description: settings.description,
      },
      icon: "", // Placeholder for icon URL
      createdAt: moment().format(),
    });

    const savedWorkspace = await workspace.save();

    // Handle icon upload with S3
    if (icon && icon.originalname) {
      const fileName = `workspace/${savedWorkspace._id}/icon/${Date.now()}-${icon.originalname}`;
      presignedUrl = await putPresignedUrl(fileName);
      iconUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
      
      // Update the workspace with the icon URL
      savedWorkspace.icon = iconUrl;
      await savedWorkspace.save();
    }

    res.json({
      success: true,
      message: "Workspace created successfully",
      data: {
        workspace: filterWorkspaceData(savedWorkspace),
        iconUrl: iconUrl ? iconUrl : null,
        presignedUrl: presignedUrl ? presignedUrl : null,
      },
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

    // Generate presigned URL for the icon if it exists
    let workspaceData = filterWorkspaceData(workspace);
    if (workspace.icon) {
      const iconKey = workspace.icon.split(`${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`)[1];
      workspaceData.icon = await getPresignedUrl(iconKey);
    }

    res.json({
      success: true,
      message: "Workspace fetched successfully",
      data: workspaceData,
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

    // Generate presigned URLs for all workspace icons
    const workspacesWithPresignedUrls = await Promise.all(
      workspaces.map(async (workspace) => {
        const workspaceData = filterWorkspaceData(workspace);
        console.log(workspace.icon);
        if (workspace.icon) {
          const iconKey = workspace.icon.split(`${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`)[1];
          workspaceData.icon = await getPresignedUrl(iconKey);
        }
        return workspaceData;
      })
    );

    res.json({
      success: true,
      message: "Workspaces fetched successfully",
      data: workspacesWithPresignedUrls,
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
      const iconKey = workspace.icon.split(`${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`)[1];
      await DeleteS3Image(iconKey);
    }

    // Delete all associated posts and their images
    const [twitterPosts, linkedinPosts, instagramPosts] = await Promise.all([
      TwitterPost.find({ workspaceId }),
      LinkedinPost.find({ workspaceId }),
      InstagramPost.find({ workspaceId }),
    ]);

    // Delete images from S3
    const deleteImagePromises = [
      ...twitterPosts,
      ...linkedinPosts,
      ...instagramPosts
    ].filter(post => post.img).map(post => {
      const imgKey = post.img.split(`${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`)[1];
      return DeleteS3Image(imgKey);
    });

    await Promise.all(deleteImagePromises);

    // Delete all posts
    await Promise.all([
      TwitterPost.deleteMany({ workspaceId }),
      LinkedinPost.deleteMany({ workspaceId }),
      InstagramPost.deleteMany({ workspaceId }),
    ]);

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
    const { name, about, settings, icon } = req.body;

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

    // Generate presigned URL for icon upload if file is present
    let iconUrl;
    let presignedUrl;
    if (icon && icon.originalname) {
      if (workspace.icon) {
        const iconKey = workspace.icon.split(`${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`)[1];
        await DeleteS3Image(iconKey);
      }
      const fileName = `workspace/${workspaceId}/icon/${Date.now()}-${icon.originalname}`;
      presignedUrl = await putPresignedUrl(fileName);
      // Return both the presigned URL and the final S3 URL
      iconUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    }

    if (name) workspace.name = name;
    if (about !== undefined) workspace.about = about;
    if (iconUrl) workspace.icon = iconUrl;
    if (settings) {
      workspace.settings = {
        ...workspace.settings,
        ...settings,
      };
    }

    await workspace.save();

    res.json({
      success: true,
      message: "Workspace updated successfully",
      data: {
        workspace: filterWorkspaceData(workspace),
        iconUrl: iconUrl ? iconUrl : null,
        presignedUrl: presignedUrl ? presignedUrl : null,
      },
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
