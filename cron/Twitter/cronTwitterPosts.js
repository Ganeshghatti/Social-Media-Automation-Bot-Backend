const cron = require("node-cron");
const ShopifyScrape = require("../../scraping/ShopifyScrape");
const GeneratePostContent = require("../../utils/Twitter/GeneratePostContent");
const TwitterPost = require("../../models/TwitterPosts");
const moment = require("moment");
const GenerateImage = require("../../utils/Twitter/GenerateImage");
const NotifyCreatePost = require("../../utils/mail/NotifyCreatePost");
const axios = require("axios");
const UploadImage = require("../../utils/cloud/UploadImage");
const NotifyError = require("../../utils/mail/NotifyError");

const cronTwitterPosts = async (time) => {
  try {
    for (const t of time) {
      console.log("Starting Shopify blog scraping cron job...");
      const blogPosts = await ShopifyScrape();

      if (!blogPosts || blogPosts.length === 0) {
        console.log("No blog posts found");
        return;
      }

      // Select most relevant post
      const selectionPrompt = `
            You are a content curator for a web development focused Twitter account. 
            I have the following ${
              blogPosts.length
            } blog posts from Shopify's blog. 
            Select the most relevant post for a web development audience.
            The selected post should be related to website development, coding, app development, automation, AI, social media marketing, or SEO.
            
            Blog Posts:
            ${JSON.stringify(blogPosts, null, 2)}
            
            Return ONLY a JSON response in this format:
            {
                "selectedIndex": number (0,1,2), // Must be 0, 1, or 2
                "reason": "brief explanation of why this post was selected"
            }
        `;

      console.log("Generating content selection...");
      const selectionResponse = await GeneratePostContent(selectionPrompt);
      console.log("Raw Gemini response:", selectionResponse);

      let selection;
      try {
        // Clean up the response if needed (remove any markdown formatting)
        const cleanResponse = selectionResponse
          .replace(/```json\n|\n```/g, "")
          .trim();
        selection = JSON.parse(cleanResponse);

        if (!selection || typeof selection.selectedIndex !== "number") {
          throw new Error("Invalid selection format");
        }
      } catch (error) {
        console.error("Error parsing Gemini response:", error);
        await NotifyError("Error parsing selection response: " + error.message, "cron Twitter Posts");
        return;
      }

      const selectedPost = blogPosts[selection.selectedIndex];
      console.log("Selected post:", selectedPost);
      console.log("Selection reason:", selection.reason);

      // Generate post content
      const postPrompt = `
            You are a web developer and digital marketing expert who helps businesses grow online.
            Create an informative and engaging post based on this article: ${JSON.stringify(
              selectedPost
            )}
            
            Requirements:
            - Extract 2-3 specific, actionable tips or statistics from the article
            - Focus on sharing valuable knowledge, not selling
            - Make it practical and implementable
            - Use numbers and data points when available
            - Break down complex concepts into simple terms
            - Add one subtle CTA at the end about website/social media services
            - Keep it between 2000-2500 characters
            - Make it feel like expert advice, not marketing
            - Don't mention the article source
            - Format it with line breaks for readability
            
            Example format:
            [Catchy title or hook]
            
            [2 sentences about the post]
            
            [content of the post in 3-4 sentences]

            [2-3 actionable tips or statistics]
            
            [Subtle CTA]
            
            Return ONLY the post text, nothing else.
        `;

      const postContent = await GeneratePostContent(postPrompt);
      if (!postContent) {
        console.error("Post content generation failed.");
        await NotifyError("Post content generation failed.", "cron Twitter Posts");
        return;
      }
      console.log("Generated post content successfully.");

      // Creative prompt for image generation
      const imagePrompt = `
            Create a visually stunning image that captures the essence of ${selectedPost.title}. 
            Ensure that the generated image does not contain any text. Keep one object in center and create clean background.
        `;

      const imageBuffer = await GenerateImage(imagePrompt);

      if (!imageBuffer) {
        console.error("Image generation failed.");
        await NotifyError("Image generation failed.", "cron Twitter Posts");
        return;
      }
      console.log("Image created successfully.");

      const fileName = `post-${Date.now()}.jpg`;
      const imageUrl = await UploadImage(imageBuffer, fileName, "twitter");
  
      const publishTime = moment()
        .add(1, 'days')
        .set({
          hour: t.publishedAt[0],
          minute: t.publishedAt[1],
          second: t.publishedAt[2],
          millisecond: t.publishedAt[3],
        })
        .toDate();

      console.log("Publish time set to:", publishTime);
      const post = new TwitterPost({
        text: postContent,
        tobePublishedAt: publishTime,
        isPublished: false,
        img: imageUrl,
        status: "scheduled",
      });

      await post.save();
      console.log("Post saved successfully:", post);
      NotifyCreatePost(post);
    }
  } catch (error) {
    console.error("Error in Shopify Scrape Posts:", error.message);
    await NotifyError("Error in Shopify Scrape Posts: " + error.message, "cron Twitter Posts");
  }
};

module.exports = { cronTwitterPosts };

cron.schedule("25 18 * * *", () => {
  // Times are in IST (UTC+5:30)
  const time = [
    { publishedAt: [9, 0, 0, 0] },  // 9:00 AM IST
    { publishedAt: [18, 40, 0, 0] }  // 9:00 PM IST
  ];
  cronTwitterPosts(time);
});
