const TwitterPosts = require("../../../models/TwitterPosts");
const Workspace = require("../../../models/WorkSpace");
const checkWorkspaceOwnership = require("../../../utils/checkWorkspaceOwnership");
const putPresignedUrl = require("../../../utils/cloud/putPresignedUrl");
const mongoose = require("mongoose");
const validateRequestedAccounts = require("../../../utils/validateRequestedAccounts");
const publishTwitterPost = require("../../../utils/Twitter/PublishPost");
const checkSubscriptionLimits = require("../../../utils/checkSubscriptionLimits");
const moment = require("moment");
require("dotenv").config();

exports.CreatePostPresignedUrl = async (req, res) => {
  try {
    const { posts } = req.body;
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

    const limitsResult = await checkSubscriptionLimits(workspace, posts);
    if (!limitsResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          message: limitsResult.message,
          code: 400,
        },
      });
    }

    // Process each post separately
    const processedPosts = await Promise.all(
      posts.map(async (post) => {
        // Validate account for this post
        await validateRequestedAccounts(workspace, post);

        switch (post.type) {
          case "twitter":
            return await processTwitterPost(post, workspaceId);
          default:
            console.log(`Unsupported platform: ${post.type}`);
            return null;
        }
      })
    );

    res.json({
      success: true,
      message: "Posts processed successfully",
      data: processedPosts.filter((post) => post !== null),
    });
  } catch (error) {
    console.error("Error in CreatePost:", error);
    res.status(error.code || 500).json({
      success: false,
      error: {
        message: error.message,
        code: error.code || 500,
      },
    });
  }
};

const processTwitterPost = async (post, workspaceId) => {
  const processedPost = { ...post };
  const postId = new mongoose.Types.ObjectId();
  processedPost._id = postId;

  if (post.posttype === "thread") {
    // Process thread posts
    processedPost.posts = await Promise.all(
      post.posts.map(async (threadPost) => {
        const threadPostId = new mongoose.Types.ObjectId();
        return {
          ...threadPost,
          _id: threadPostId,
          media: await processMediaForPost(
            threadPost,
            workspaceId,
            post.accountId,
            threadPostId
          ),
        };
      })
    );
  } else {
    // Process single post media
    if (post.media?.length > 0) {
      processedPost.media = await processMediaForPost(
        post,
        workspaceId,
        post.accountId,
        postId
      );
    }
  }

  return processedPost;
};

const processMediaForPost = async (post, workspaceId, accountId, postId) => {
  if (!post.media?.length) return [];

  return Promise.all(
    post.media.map(async (media) => {
      const timestamp = Date.now();
      const filename = `${timestamp}-${media.originalname}`;
      const s3Key = `workspace/${workspaceId}/posts/twitter-${accountId}/${postId}/${filename}`;

      return {
        originalname: media.originalname,
        size: media.size,
        mimetype: media.mimetype,
        presignedUrl: await putPresignedUrl(s3Key),
        mediaUrl: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`,
      };
    })
  );
};

exports.CreatePosts = async (req, res) => {
  try {
    const { posts } = req.body;
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
    const limitsResult = await checkSubscriptionLimits(workspace, posts);
    if (!limitsResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          message: limitsResult.message,
          code: 400,
        },
      });
    }
    // Process each post
    for (const post of posts) {
      switch (post.type) {
        case "twitter":
          await processTwitterPostForCreation(post, workspace);
          break;
        default:
          console.log(`Unsupported platform: ${post.type}`);
      }
    }

    res.json({
      success: true,
      message: "Posts created successfully",
    });
  } catch (error) {
    console.error("Error in CreatePost:", error);
    res.status(error.code || 500).json({
      success: false,
      error: {
        message: error.message,
        code: error.code || 500,
      },
    });
  }
};

const processTwitterPostForCreation = async (post, workspace) => {
  if (post.posttype === "thread") {
    let previousPost = null;
    const totalPosts = post.posts.length;

    // Process each tweet in thread
    for (let i = 0; i < totalPosts; i++) {
      const threadPost = post.posts[i];
      const mediaUrls = threadPost.media?.map((m) => m.mediaUrl) || [];
      const currentPostId = new mongoose.Types.ObjectId();

      if (post.publishnow) {
        // Publish immediately
        const tweetId = await publishTwitterPost(
          workspace,
          threadPost.content,
          mediaUrls,
          previousPost?.tweetId || null,
          post.accountId
        );

        const twitterPost = await TwitterPosts.create({
          _id: currentPostId,
          workspaceId: workspace._id,
          userId: workspace.userId,
          type: "thread",
          content: threadPost.content,
          media: mediaUrls,
          isPublished: true,
          status: "published",
          threadId: post._id,
          previousPost: previousPost?._id || null,
          threadPosition: i + 1,
          tweetId: tweetId,
          tobePublishedAt: moment().format(),
          createdAt: moment().format(),
        });

        if (previousPost) {
          await TwitterPosts.findByIdAndUpdate(previousPost._id, {
            nextPost: currentPostId
          });
        }

        previousPost = twitterPost;
      } else {
        // Schedule for later
        const twitterPost = await TwitterPosts.create({
          _id: currentPostId,
          workspaceId: workspace._id,
          userId: workspace.userId,
          type: "thread",
          content: threadPost.content,
          media: mediaUrls,
          threadId: post._id,
          previousPost: previousPost?._id || null,
          threadPosition: i + 1,
          tobePublishedAt: post.tobePublishedAt,
          isPublished: false,
          status: "scheduled",
          createdAt: moment().format(),
        });

        if (previousPost) {
          await TwitterPosts.findByIdAndUpdate(previousPost._id, {
            nextPost: currentPostId
          });
        }

        previousPost = twitterPost;
      }
    }
  } else {
    // Process single post
    const mediaUrls = post.media?.map((m) => m.mediaUrl) || [];

    if (post.publishnow) {
      const tweetId = await publishTwitterPost(
        workspace,
        post.content,
        mediaUrls,
        null,
        post.accountId
      );

      await TwitterPosts.create({
        workspaceId: workspace._id,
        userId: workspace.userId,
        type: "post",
        content: post.content,
        media: mediaUrls,
        isPublished: true,
        status: "published",
        threadId: tweetId,
        createdAt: moment().format(),
      });
    } else {
      await TwitterPosts.create({
        workspaceId: workspace._id,
        userId: workspace.userId,
        type: "post",
        content: post.content,
        media: mediaUrls,
        tobePublishedAt: post.tobePublishedAt,
        isPublished: false,
        status: "scheduled",
        createdAt: moment().format(),
      });
    }
  }
};
