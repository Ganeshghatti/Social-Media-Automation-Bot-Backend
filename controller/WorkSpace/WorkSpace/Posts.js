const TwitterPosts = require("../../../models/TwitterPosts");
const Workspace = require("../../../models/WorkSpace");
const checkWorkspaceOwnership = require("../../../utils/checkWorkspaceOwnership");
const {UploadImage} = require("../../../utils/cloud/UploadPostImage");

exports.CreatePost = async (req, res) => {
  const { content, media, tobePublishedAt, publishnow, action, prompt } =
    req.body;
  const workspaceId = req.params.workspaceId;

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
  media = await Promise.all(media.map(async (m) => {
    const url = await UploadImage(m.buffer, m.originalname, workspace.socialMediaName);
    return url;
  }));
  const post = new TwitterPosts({
    workspaceId,
    content,
    media,
    tobePublishedAt,
    action,
    prompt,
  });
  await post.save();
  res.json(post);
};
