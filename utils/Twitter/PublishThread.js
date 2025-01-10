const publishTwitterPost = require("./PublishPost");

const publishTwitterThread = async (workspace, threadPosts, accountId) => {
  try {
    let previousTweetId = null;
    const publishedTweets = [];
    
    for (const post of threadPosts) {
      const mediaUrls = post.media?.map(m => m.mediaUrl) || [];
      
      const tweetId = await publishTwitterPost(
        workspace,
        post.content,
        mediaUrls,
        previousTweetId
      );

      publishedTweets.push(tweetId);
      previousTweetId = tweetId;
    }

    return publishedTweets;
  } catch (error) {
    console.error("Error publishing thread:", error);
    throw error;
  }
};

module.exports = publishTwitterThread; 