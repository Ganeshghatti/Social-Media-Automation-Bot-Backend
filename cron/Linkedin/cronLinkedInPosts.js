const cron = require("node-cron");
const GeneratePostContent = require("../../utils/Linkedin/GeneratePostContent");
const LinkedInPost = require("../../models/LinkedinPosts");
const moment = require("moment");
const NotifyError = require("../../utils/mail/NotifyError");
const credentials = require("../../linkedin-credentials.json");

const cronLinkedInPosts = async (time) => {
  try {
    for (const t of time) {
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
      console.log("Generated post content:", postContent, "end");

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
      const post = new LinkedInPost({
        text: postContent,
        tobePublishedAt: publishTime,
        isPublished: false,
      });

      await post.save();
      NotifyCreatePost(post);
    }
  } catch (error) {
    console.error("Error in Shopify Scrape Posts:", error.message);
    await NotifyError(error.message, "cron Shopify Scrape Posts");
  }
};

module.exports = { cronLinkedInPosts };

cron.schedule(
  "0 16 * * *",
  () => {
    // Times are in IST (UTC+5:30)
    const time = [
      { publishedAt: [9, 0, 0, 0] }, // 9:00 AM IST
      { publishedAt: [21, 0, 0, 0] }, // 9:00 PM IST
    ];
    cronLinkedInPosts(time);
  },
  {
    timezone: "Asia/Kolkata",
  }
);
