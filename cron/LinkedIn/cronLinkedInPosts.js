const cron = require("node-cron");
const GeneratePostContent = require("../../utils/Linkedin/GeneratePostContent");
const LinkedInPost = require("../../models/LinkedinPosts");
const moment = require("moment");
const NotifyError = require("../../utils/mail/NotifyError");
const NotifyCreatePost = require("../../utils/mail/NotifyCreatePost");
const credentials = require("../../linkedin-credentials.json");
const dotenv = require("dotenv");
const axios = require("axios");

const envFile = process.env.SOCIAL_MEDIA_ENV;
dotenv.config({ path: envFile });

const cronLinkedInPosts = async (time) => {
  try {
    for (const t of time) {
      console.log("Starting LinkedIn post generation...");

      const prompt = `
            You are a professional LinkedIn content creator specializing in web development and technology.
            Create an engaging LinkedIn post based on this article: Importance of SEO 
            
            Requirements:
            - Professional and business-oriented tone
            - Include 2-3 key insights or takeaways
            - Use bullet points for better readability
            - Include relevant statistics if available
            - End with a thought-provoking question
            - Keep it between 3000-4500 characters
            - Add appropriate line breaks
            - Don't mention the source article
            
            Format:
            [Hook/Attention grabber]
            
            [Main content with insights]
            
            • [Key point 1]
            • [Key point 2]
            • [Key point 3]
            
            [Engaging question]
            
            Return ONLY the post text, nothing else.
          `;

      const postContent = await GeneratePostContent(prompt);
      if (!postContent) {
        const errorMessage =
          "Failed to generate post content. Please check the prompt and try again.";
        console.error(errorMessage);
        await NotifyError(errorMessage, "Instant Post");
        return;
      }
      console.log("Post content generated successfully:", postContent);

      const publishTime = moment()
        .tz("Asia/Kolkata")
        // .add(1, "days")
        .set({
          hour: t.publishedAt[0],
          minute: t.publishedAt[1],
          second: t.publishedAt[2],
          millisecond: t.publishedAt[3],
        })
        .utcOffset("+05:30", true)
        .toDate();

      const post = new LinkedInPost({
        text: postContent,
        tobePublishedAt: publishTime,
        isPublished: false,
      });

      await post.save();
      console.log("Post saved successfully for future publication:", post);
      NotifyCreatePost(post);
    }
  } catch (error) {
    const errorMessage = `An error occurred during the LinkedIn post generation: ${error.message}`;
    console.error(errorMessage);
    await NotifyError(errorMessage, "cron LinkedIn Posts");
  }
};

module.exports = { cronLinkedInPosts };

cron.schedule(
  "39 18 * * *",
  () => {
    // Times are in IST (UTC+5:30)
    const time = [
      { publishedAt: [6, 45, 0, 0] }, // 9:00 PM IST
    ];
    cronLinkedInPosts(time);
  },
  {
    timezone: "Asia/Kolkata",
  }
);
