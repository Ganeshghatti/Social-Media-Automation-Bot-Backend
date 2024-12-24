const cron = require("node-cron");
const ShopifyScrape = require("../../scraping/ShopifyScrape");
const GeneratePostContent = require("../../utils/Instagram/GeneratePostContent");
const InstagramPost = require("../../models/InstagramPosts");
const moment = require("moment");
const CreateImage = require("../../utils/Instagram/CreateImage");
const NotifyCreatePost = require("../../utils/mail/NotifyCreatePost");
const axios = require("axios");
const UploadImage = require("../../utils/cloud/UploadImage");
const GenerateCaption = require("../../utils/Instagram/GenerateCaption");
const NotifyError = require("../../utils/mail/NotifyError");
const dotenv = require("dotenv");

const envFile = process.env.SOCIAL_MEDIA_ENV;
dotenv.config({ path: envFile });

const config = {
  apiVersion: "v21.0",
  accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
  businessAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID,
};

const cronInstagramPosts = async (time) => {
  try {
    for (const t of time) {
      console.log("Starting Instagram post generation...");

      const prompt =
        "Create an engaging Instagram post about the importance of SEO, highlighting its benefits in 3-4 concise points.";
      const selectionResponse = await GeneratePostContent(prompt);
      console.log("Raw Gemini response:", selectionResponse);
      if (!selectionResponse) {
        const errorMessage = "Failed to generate post content.";
        console.error(errorMessage);
        NotifyError(errorMessage, "Instant Post");
        return { success: false, message: errorMessage };
      }
      console.log("Post content generated successfully.");

      const captionPrompt = `Craft a catchy Instagram caption for this post: ${selectionResponse} Example format: [Catchy title or hook] [hashtags] [call to action] Return ONLY the caption text, nothing else.`;
      const caption = await GenerateCaption(captionPrompt);
      console.log("Generated caption:", caption);
      if (!caption) {
        const errorMessage = "Failed to generate caption.";
        console.error(errorMessage);
        NotifyError(errorMessage, "Instant Post");
        return { success: false, message: errorMessage };
      }
      console.log("Caption generated successfully.");

      // Creative prompt for image generation
      const imageBuffer = await CreateImage(selectionResponse);
      console.log("Image path generated:", imageBuffer);
      if (!imageBuffer) {
        const errorMessage = "Image generation failed.";
        console.error(errorMessage);
        NotifyError(errorMessage, "Instant Post");
        return { success: false, message: errorMessage };
      }
      console.log("Image generated successfully.");

      const fileName = `post-${Date.now()}.jpg`;
      const imageurl = await UploadImage(imageBuffer, fileName, "instagram");

      const publishTime = moment()
        .tz("Asia/Kolkata")
        .add(1, "days")
        .set({
          hour: t.publishedAt[0],
          minute: t.publishedAt[1],
          second: t.publishedAt[2],
          millisecond: t.publishedAt[3],
        })
        .utcOffset("+05:30", true)
        .toDate();

      const post = new InstagramPost({
        text: caption,
        tobePublishedAt: publishTime,
        isPublished: false,
        img: imageurl,
      });

      await post.save();
      console.log("Post saved successfully:", post);
      NotifyCreatePost(post);
    }
  } catch (error) {
    console.error("Error in Instagram post generation:", error.message);
    await NotifyError(error.message, "cron Instagram Posts");
  }
};

module.exports = { cronInstagramPosts };

cron.schedule(
  "6 18 * * *",
  () => {
    // Times are in IST (UTC+5:30)
    const time = [
      { publishedAt: [9, 0, 0, 0] }, // 9:00 AM IST
      { publishedAt: [6, 20, 0, 0] }, // 9:00 PM IST
    ];
    cronInstagramPosts(time);
  },
  {
    timezone: "Asia/Kolkata",
  }
);
