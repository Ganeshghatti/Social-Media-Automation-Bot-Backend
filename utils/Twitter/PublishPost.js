const { TwitterApi } = require("twitter-api-v2");
const axios = require("axios");
const getPresignedUrl = require("../cloud/getPresignedUrl");
require("dotenv").config();

const getMimeType = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  const mimeTypes = {
    'jpeg': 'image/jpeg',
    'jpg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime'
  };
  return mimeTypes[ext] || 'image/jpeg'; // default to jpeg if unknown
};

const publishTwitterPost = async (
  workspace,
  content,
  mediaUrls = [],
  replyToId = null
) => {
  try {
    const twitterAccount = workspace.connectedAccounts.find(
      (account) => account.type === "twitter"
    );
    console.log("Twitter credentials found:", {
      apiKey: process.env.TWITTER_API_KEY ? "✓" : "✗",
      apiSecret: process.env.TWITTER_API_SECRET ? "✓" : "✗",
      accessToken: twitterAccount?.credentials?.accessToken ? "✓" : "✗",
      accessSecret: twitterAccount?.credentials?.accessSecret ? "✓" : "✗",
    });
    console.log(mediaUrls);
    if (!twitterAccount || !twitterAccount.credentials) {
      throw new Error("Twitter account not connected");
    }

    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: twitterAccount.credentials.accessToken,
      accessSecret: twitterAccount.credentials.accessSecret,
    });

    // Upload media if present
    let mediaIds = [];
    if (mediaUrls.length > 0) {
      console.log("Processing media files for Twitter upload");
      mediaIds = await Promise.all(
        mediaUrls.map(async (url) => {
          try {
            // Extract the key and filename from the S3 URL
            console.log("url",url);
            const key = url.split(`${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`)[1];
            const filename = key.split('/').pop();
            console.log("Processing file:", filename);

            // Get the MIME type
            const mimeType = getMimeType(filename);
            console.log("Detected MIME type:", mimeType);

            // Get presigned URL for downloading
            const presignedUrl = await getPresignedUrl(key);
            console.log("Got presigned URL for download");

            // Download file using presigned URL
            const response = await axios.get(presignedUrl, {
              responseType: 'arraybuffer'
            });
            console.log("Successfully downloaded file from S3");

            // Upload to Twitter with MIME type
            const mediaId = await client.v1.uploadMedia(response.data, {
              mimeType: mimeType
            });
            console.log("Successfully uploaded to Twitter, mediaId:", mediaId);
            return mediaId;
          } catch (error) {
            console.error("Error processing media:", error);
            throw new Error(`Failed to process media: ${error.message}`);
          }
        })
      );
    }

    // Prepare tweet data
    const tweetData = {
      text: content,
      ...(mediaIds.length > 0 && { media: { media_ids: mediaIds } }),
      ...(replyToId && { reply: { in_reply_to_tweet_id: replyToId } }),
    };

    console.log("Sending tweet with data:", {
      textLength: content.length,
      mediaCount: mediaIds.length,
      replyToId: replyToId || "none",
    });

    // Post tweet
    const tweet = await client.v2.tweet(tweetData);
    console.log("Tweet posted successfully, id:", tweet.data.id);
    return tweet.data.id;
  } catch (error) {
    console.error("Error in publishTwitterPost:", error);
    throw error;
  }
};

module.exports = publishTwitterPost;
