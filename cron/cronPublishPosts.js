const { TwitterApi } = require("twitter-api-v2");
const cron = require("node-cron");
const moment = require("moment");
const axios = require("axios");
const TwitterPosts = require("../models/TwitterPosts");
const InstagramPosts = require("../models/InstagramPosts");
const LinkedinPosts = require("../models/LinkedinPosts");
const NotifyPublishPost = require("../utils/mail/NotifyPublishPost");
const NotifyError = require("../utils/mail/NotifyError");
const credentials = require("../linkedin-credentials.json");

// Twitter client setup
const TwitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

const rwClient = TwitterClient.readWrite;

// Instagram config
const instagramConfig = {
  apiVersion: "v21.0",
  accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
  businessAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID,
};

const cronPublishPosts = async () => {
  try {
    const currentDate = moment();
    console.log(
      `Checking for posts to publish at ${currentDate.format(
        "MMMM Do YYYY, h:mm:ss a"
      )}`
    );

    // Get all posts (including future posts) for all platforms
    const [allTwitterPosts, allInstagramPosts, allLinkedinPosts] =
      await Promise.all([
        TwitterPosts.find().sort({ tobePublishedAt: 1 }),
        InstagramPosts.find().sort({ tobePublishedAt: 1 }),
        LinkedinPosts.find().sort({ tobePublishedAt: 1 }),
      ]);

    // Filter future posts
    const futureTwitterPosts = allTwitterPosts.filter((post) =>
      moment(post.tobePublishedAt).isAfter(currentDate)
    );
    const futureInstagramPosts = allInstagramPosts.filter((post) =>
      moment(post.tobePublishedAt).isAfter(currentDate)
    );
    const futureLinkedinPosts = allLinkedinPosts.filter((post) =>
      moment(post.tobePublishedAt).isAfter(currentDate)
    );

    console.log("\n=== Future Posts Summary ===");
    console.log(`Future Twitter Posts: ${futureTwitterPosts.length}`);
    console.log(`Future Instagram Posts: ${futureInstagramPosts.length}`);
    console.log(`Future LinkedIn Posts: ${futureLinkedinPosts.length}`);
    console.log("=========================\n");

    // Get unpublished posts for all platforms that are due now
    const [twitterPosts, instagramPosts, linkedinPosts] = await Promise.all([
      TwitterPosts.find({
        tobePublishedAt: { $lte: currentDate.toDate() },
        isPublished: false,
      }).sort({ tobePublishedAt: 1 }),
      InstagramPosts.find({
        tobePublishedAt: { $lte: currentDate.toDate() },
        isPublished: false,
      }).sort({ tobePublishedAt: 1 }),
      LinkedinPosts.find({
        tobePublishedAt: { $lte: currentDate.toDate() },
        isPublished: false,
      }).sort({ tobePublishedAt: 1 }),
    ]);

    console.log(
      `Found ${twitterPosts.length} Twitter posts, ${instagramPosts.length} Instagram posts, ${linkedinPosts.length} LinkedIn posts to publish`
    );

    // Publish Twitter posts
    for (const post of twitterPosts) {
      try {
        const imageResponse = await axios.get(post.img, {
          responseType: "arraybuffer",
        });
        const mediaId = await TwitterClient.v1.uploadMedia(imageResponse.data, {
          mimeType: "image/jpeg",
        });

        await rwClient.v2.tweet({
          text: post.text.slice(0, 250),
          media: { media_ids: [mediaId] },
        });

        post.isPublished = true;
        post.status = "published";
        await post.save();
        await NotifyPublishPost(post, "Twitter");
      } catch (error) {
        await NotifyError(`Twitter: ${error.message}`, "Publish Posts");
      }
    }

    // Publish Instagram posts
    for (const post of instagramPosts) {
      try {
        const containerResponse = await axios.post(
          `https://graph.facebook.com/${instagramConfig.apiVersion}/${instagramConfig.businessAccountId}/media`,
          {
            image_url: post.img,
            caption: post.text,
            access_token: instagramConfig.accessToken,
          }
        );

        const containerId = containerResponse.data.id;
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for processing

        await axios.post(
          `https://graph.facebook.com/${instagramConfig.apiVersion}/${instagramConfig.businessAccountId}/media_publish`,
          {
            creation_id: containerId,
            access_token: instagramConfig.accessToken,
          }
        );

        post.isPublished = true;
        post.status = "published";
        await post.save();
        await NotifyPublishPost(post, "Instagram");
      } catch (error) {
        await NotifyError(`Instagram: ${error.message}`, "Publish Posts");
      }
    }

    // Publish LinkedIn posts
    for (const post of linkedinPosts) {
      try {
        let postData = {
          author: `urn:li:person:${credentials.personId}`,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: {
                text: post.text
              },
              shareMediaCategory: post.img ? "IMAGE" : "NONE"
            }
          },
          visibility: {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
          }
        };

        if (post.img) {
          // Download image for LinkedIn upload
          const imageResponse = await axios.get(post.img, {
            responseType: "arraybuffer",
          });
          const downloadedImageBuffer = imageResponse.data;

          // Register image with LinkedIn
          const registerImageResponse = await axios.post(
            'https://api.linkedin.com/v2/assets?action=registerUpload',
            {
              registerUploadRequest: {
                recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
                owner: `urn:li:person:${credentials.personId}`,
                serviceRelationships: [{
                  relationshipType: "OWNER",
                  identifier: "urn:li:userGeneratedContent"
                }]
              }
            },
            {
              headers: {
                'Authorization': `Bearer ${credentials.accessToken}`,
                'Content-Type': 'application/json',
              }
            }
          );

          const uploadUrl = registerImageResponse.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
          const asset = registerImageResponse.data.value.asset;

          // Upload image to LinkedIn
          await axios.put(uploadUrl, downloadedImageBuffer, {
            headers: {
              'Authorization': `Bearer ${credentials.accessToken}`,
              'Content-Type': 'application/octet-stream',
            }
          });

          // Add media to post data
          postData.specificContent["com.linkedin.ugc.ShareContent"].media = [{
            status: "READY",
            description: {
              text: "Post image"
            },
            media: asset,
            title: {
              text: "Post image"
            }
          }];
        }

        await axios.post(
          "https://api.linkedin.com/v2/ugcPosts",
          postData,
          {
            headers: {
              Authorization: `Bearer ${credentials.accessToken}`,
              "Content-Type": "application/json",
              "X-Restli-Protocol-Version": "2.0.0",
            },
          }
        );

        post.isPublished = true;
        post.status = "published";
        await post.save();
        await NotifyPublishPost(post, "LinkedIn");
      } catch (error) {
        await NotifyError(`LinkedIn: ${error.message}`, "Publish Posts");
      }
    }
  } catch (error) {
    console.error("Error in Publish Posts CronJob:", error);
    await NotifyError(error.message, "Publish Posts");
  }
};

module.exports = { cronPublishPosts };

// Run every 5 minutes
cron.schedule("*/5 * * * *", cronPublishPosts);
