const User = require("../models/User");
const TwitterPosts = require("../models/TwitterPosts");

const checkSubscriptionLimits = async (workspace, posts) => {
  const user = await User.findById(workspace.userId);

  if (user.subscription === "free") {
    // Check connected accounts limit
    if (workspace.connectedAccounts.length > 2) {
      return { success: false, message: "Free tier users can only connect two social media accounts" };
    }

    // Check each post in the Twitter posts array
    for (const post of posts) {
      // Check thread posts limit
      if (post.type === "twitter") {
        if (post.posttype === "thread") {
          if (post.posts.length > 2) {
            return { success: false, message: "Free tier users can only post 2 tweets in a thread" };
          }

          // Check media limits for each post in thread
          for (const threadPost of post.posts) {
            if (threadPost.media?.length > 4) {
              return { success: false, message: "Maximum 4 media files allowed per tweet in thread" };
            }
          }
        } else {
          // Check media limits for single post
          if (post.media?.length > 4) {
            return { success: false, message: "Maximum 4 media files allowed per tweet" };
          }
        }
      }
    }
  }

  return { success: true };
};

module.exports = checkSubscriptionLimits;
