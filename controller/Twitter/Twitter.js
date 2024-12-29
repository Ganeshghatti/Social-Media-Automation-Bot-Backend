const TwitterPost = require("../../models/TwitterPosts");
const moment = require("moment");
const { TwitterApi } = require("twitter-api-v2");
const ShopifyScrape = require("../../scraping/ShopifyScrape");
const GeneratePostContent = require("../../utils/Twitter/GeneratePostContent");
const GenerateImage = require("../../utils/Twitter/GenerateImage");
const NotifyError = require("../../utils/mail/NotifyError");
const NotifyInstantPost = require("../../utils/mail/NotifyInstantPost");
const NotifyCreatePost = require("../../utils/mail/NotifyCreatePost");
const dotenv = require("dotenv");
const UploadImage = require("../../utils/cloud/UploadImage");
const axios = require("axios");
const DeleteImage = require("../../utils/cloud/DeleteImage");

const envFile = process.env.SOCIAL_MEDIA_ENV;
dotenv.config({ path: envFile });

const TwitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

const rwClient = TwitterClient.readWrite;

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
    const imageBuffer = await GenerateImage(imagePrompt);
    if (!imageBuffer) {
      NotifyError("Image generation failed", "Instant Post");
      return;
    }
    console.log("Image generated");
    // Upload to Firebase
    const fileName = `post-${Date.now()}.jpg`;
    const imageUrl = await UploadImage(imageBuffer, fileName, "twitter");

    // Download the image from Firebase URL
    const imageResponse = await axios.get(imageUrl, {
      responseType: "arraybuffer",
    });
    const downloadedImageBuffer = imageResponse.data;

    // Specify the media type when uploading to Twitter
    const mediaId = await TwitterClient.v1.uploadMedia(downloadedImageBuffer, {
      mimeType: "image/jpeg", // Specify the MIME type
    });

    await rwClient.v2.tweet({
      text: tweetlimit,
      media: { media_ids: [mediaId] },
    });

    const post = new TwitterPost({
      text: tweetContent,
      tobePublishedAt: moment().utc().toDate(),
      isPublished: true,
      img: imageUrl,
      status: "published",
    });

    await post.save();
    NotifyInstantPost(post);
    return res.status(200).json({
      success: true,
      message: "Post created successfully",
    });
  } catch (error) {
    NotifyError(`Error in Instant Post: ${error.message}`, "Instant Post");
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Failed to create post. Please try again later.",
    });
  }
};

exports.CreatePost = async (req, res) => {
  try {
    const { text, tobePublishedAt, action, prompt } = req.body;
    const files = req.files || {}; // Ensure files is defined
    let postContent, imageUrl;
    console.log(text, files.img ? files.img[0] : null); // Updated to check if files.img exists

    if (action === "automated") {
      // Static prompt for now, similar to InstantPost
      const staticPrompt = `
        You are a web developer and digital marketing expert who helps businesses grow online.
        Create an informative and engaging post about web development and SEO.
        
        Requirements:
        - Extract 2-3 specific, actionable tips
        - Focus on sharing valuable knowledge
        - Make it practical and implementable
        - Break down complex concepts into simple terms
        - Add one subtle CTA at the end
        - Keep it between 2000-2500 characters
        - Make it feel like expert advice
        
        Format:
        [Catchy title or hook]
        
        [2-3 sentences about the topic]
        
        [Main content]
        
        [2-3 actionable tips]
        
        [Subtle CTA]
        
        Return ONLY the post text, nothing else.
      `;

      postContent = await GeneratePostContent(staticPrompt);
      if (!postContent) {
        return res.status(400).json({
          success: false,
          message: "Failed to generate content",
        });
      }

      // Generate image based on content
      const imageBuffer = await GenerateImage(
        `Create a visually stunning image that captures the essence of ${postContent.substring(
          0,
          100
        )}. Ensure no text in image. Keep one object in center and create clean background.`
      );
      const fileName = `post-${Date.now()}.jpg`;
      imageUrl = await UploadImage(imageBuffer, fileName, "twitter");
    } else if (action === "manual") {
      // Use user provided content and image
      console.log(text, files.img ? files.img[0] : null); // Updated to check if files.img exists
      if (!text || !files.img || !files.img[0]) {
        return res.status(400).json({
          success: false,
          message: "Both text and image are required",
        });
      }
      postContent = text;
      const fileName = `post-${Date.now()}.jpg`;
      imageUrl = await UploadImage(
        files.img[0].buffer,
        fileName,
        "twitter"
      );
    } else if (action === "only-automate-content-with-prompt") {
      // Generate content with user's prompt, use user's image
      if (!prompt || !files.img || !files.img[0]) {
        return res.status(400).json({
          success: false,
          message: "Both prompt and image are required",
        });
      }
      postContent = await GeneratePostContent(prompt);
      const fileName = `post-${Date.now()}.jpg`;
      imageUrl = await UploadImage(files.img[0].buffer, fileName, "twitter");
    } else if (action === "only-automate-image-with-prompt") {
      // Use user's content, generate image with prompt
      if (!text || !prompt) {
        return res.status(400).json({
          success: false,
          message: "Both text and image prompt are required",
        });
      }
      postContent = text;
      const imageBuffer = await GenerateImage(prompt);
      const fileName = `post-${Date.now()}.jpg`;
      imageUrl = await UploadImage(imageBuffer, fileName, "twitter");
    } else if (action === "automate-with-prompt") {
      // Generate both content and image with user's prompts
      if (!prompt) {
        return res.status(400).json({
          success: false,
          message: "Prompt is required",
        });
      }
      postContent = await GeneratePostContent(prompt);
      const imageBuffer = await GenerateImage(prompt);
      const fileName = `post-${Date.now()}.jpg`;
      imageUrl = await UploadImage(imageBuffer, fileName, "twitter");
    }

    // Create and save post
    const post = new TwitterPost({
      text: postContent,
      tobePublishedAt: tobePublishedAt || new Date(),
      isPublished: false,
      img: imageUrl,
      status: "scheduled",
    });

    await post.save();
    NotifyCreatePost(post);

    return res.status(201).json({
      success: true,
      message: "Post created successfully",
      post,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Failed to create post. Please try again later.",
    });
  }
};

exports.GetAllPosts = async (req, res) => {
  try {
    const posts = await TwitterPost.find().sort({ tobePublishedAt: 1 });
    
    // Group posts by date
    const groupedPosts = posts.reduce((acc, post) => {
      const date = moment(post.tobePublishedAt).format('YYYY-MM-DD');
      
      const existingGroup = acc.find(group => group.date === date);
      if (existingGroup) {
        existingGroup.posts.push(post);
      } else {
        acc.push({
          date: date,
          posts: [post]
        });
      }
      
      return acc;
    }, []);

    res.status(200).json({
      success: true,
      data: groupedPosts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch posts"
    });
  }
};

exports.EditPost = async (req, res) => {
  try {
    const { id, text, tobePublishedAt } = req.body;
    const files = req.files;

    const post = await TwitterPost.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    if (post.status === "published") {
      return res.status(400).json({
        success: false,
        message: "Published post cannot be edited",
      });
    }

    // If new image is uploaded, delete old image and upload new one
    if (files && files.img && files.img[0]) {
      if (post.img) {
        await DeleteImage(post.img);
      }
      const fileName = `post-${Date.now()}.jpg`;
      const imageUrl = await UploadImage(
        files.img[0].buffer,
        fileName,
        "twitter"
      );
      post.img = imageUrl;
    }

    post.text = text;
    post.tobePublishedAt = tobePublishedAt;
    await post.save();

    return res.status(200).json({
      success: true,
      message: "Post updated successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Failed to update post. Please try again later.",
    });
  }
};

exports.DeletePost = async (req, res) => {
  try {
    const { id } = req.body;
    const post = await TwitterPost.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Delete image from Firebase if exists
    if (post.img) {
      await DeleteImage(post.img);
    }

    await TwitterPost.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Failed to delete post. Please try again later.",
    });
  }
};
