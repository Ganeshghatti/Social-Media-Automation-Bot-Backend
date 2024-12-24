const TwitterPost = require("../../models/TwitterPosts");
const fs = require("fs");
const moment = require("moment");
const { TwitterApi } = require("twitter-api-v2");
const ShopifyScrape = require("../../scraping/ShopifyScrape");
const GeneratePostContent = require("../../utils/Twitter/GeneratePostContent");
const GenerateImage = require("../../utils/Twitter/GenerateImage");
const NotifyError = require("../../utils/mail/NotifyError");
const NotifyInstantPost = require("../../utils/mail/NotifyInstantPost");
const dotenv = require("dotenv");
const path = require("path");

const envFile = process.env.SOCIAL_MEDIA_ENV;
dotenv.config({ path: envFile });

const TwitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

const rwClient = TwitterClient.readWrite;

exports.GetAllPosts = async (req, res) => {
  try {
    const posts = await TwitterPost.find().sort({ createdAt: -1 });

    const postsWithImages = await Promise.all(
      posts.map(async (post) => {
        const postObj = post.toObject();

        try {
          const imageBuffer = fs.readFileSync(post.img);
          const base64Image = imageBuffer.toString("base64");
          const imageType = path.extname(post.img).slice(1);
          postObj.imageData = `data:image/${imageType};base64,${base64Image}`;
        } catch (error) {
          console.error(`Error reading image for post ${post._id}:`, error);
          postObj.imageData = null;
        }

        return postObj;
      })
    );

    res.status(200).json({
      success: true,
      posts: postsWithImages,
    });
  } catch (error) {
    console.error("Error in GetAllPosts:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch posts",
    });
  }
};

exports.InstantPost = async (req, res, next) => {
  try {
    console.log("Starting blog scraping...");
    const blogPosts = await ShopifyScrape();

    if (!blogPosts || blogPosts.length === 0) {
      NotifyError("Error in ShopifyScrape", "Instant Post");
      return;
    }

    // Select most relevant post
    const selectionPrompt = `
            You are a content curator for a web development focused Twitter account. 
            I have the following ${blogPosts.length} blog posts. 
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

    const selectionResponse = await GeneratePostContent(selectionPrompt);
    console.log("Raw Gemini response:", selectionResponse);
    if (!selectionResponse) {
      NotifyError("Error in Shortlist posts", "Instant Post");
      return;
    }

    let selection;
    try {
      const cleanResponse = selectionResponse
        .replace(/```json\n|\n```/g, "")
        .trim();
      selection = JSON.parse(cleanResponse);

      if (!selection || typeof selection.selectedIndex !== "number") {
        throw new Error("Invalid selection format");
      }
    } catch (error) {
      NotifyError("Error parsing Gemini response", "Instant Post");
      return;
    }

    const selectedPost = blogPosts[selection.selectedIndex];

    if (!selection.selectedIndex) {
      NotifyError("Error in Selected post", "Instant Post");
      return;
    }
    // Generate Twitter post
    const tweetPrompt = `
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
            
            Return ONLY the tweet text, nothing else.
        `;

    const tweetContent = await GeneratePostContent(tweetPrompt);
    console.log("Generated tweet:", tweetContent);
    if (!tweetContent) {
      NotifyError("Error in Generate tweet", "Instant Post");
      return;
    }

    // Creative prompt for image generation
    const imagePrompt = `
            Create a visually stunning image that captures the essence of ${tweetContent}. 
            Ensure that the generated image does not contain any text. Keep one object in center and create clean background.
        `;

    const tweetlimit = tweetContent.slice(0, 250);
    const imagePath = await GenerateImage(imagePrompt);

    if (!imagePath) {
      NotifyError("Image generation failed", "Instant Post");
      return;
    }
    const mediaId = await TwitterClient.v1.uploadMedia(imagePath);
    await rwClient.v2.tweet({
      text: tweetlimit,
      media: { media_ids: [mediaId] },
    });

    const post = new TwitterPost({
      text: tweetContent,
      tobePublishedAt: moment().tz("Asia/Kolkata").toDate(),
      isPublished: true,
      img: imagePath,
    });

    await post.save();
    NotifyInstantPost(post);
    return res.status(200).json({
      success: true,
      message: "Post created successfully",
    });
  } catch (error) {
    NotifyError(`Error in Instant Post: ${error.message}`, "Instant Post");
    console.log(error);
    res.status(500).json({
      error: "Failed to create post. Please try again later.",
    });
  }
};
