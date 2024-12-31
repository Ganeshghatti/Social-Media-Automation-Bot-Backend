const TwitterPost = require("../../models/TwitterPosts");
const moment = require("moment");
const { TwitterApi } = require("twitter-api-v2");
const ShopifyScrape = require("../../scraping/ShopifyScrape");
const GeneratePostContent = require("../../utils/Twitter/GeneratePostContent");
const GenerateImage = require("../../utils/Twitter/GenerateImage");
const GenerateImagePrompt = require("../../utils/Twitter/GenerateImagePrompt");
const NotifyError = require("../../utils/mail/NotifyError");
const NotifyInstantPost = require("../../utils/mail/NotifyInstantPost");
const NotifyCreatePost = require("../../utils/mail/NotifyCreatePost");
const UploadImage = require("../../utils/cloud/UploadImage");
const axios = require("axios");
const DeleteImage = require("../../utils/cloud/DeleteImage");
const User = require("../../models/User");
require('dotenv').config()

exports.InstantPost = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.credentials.twitter.isConnected) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Please connect your Twitter account to post.",
          code: 400
        }
      });
    }

    const userTwitterClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: user.credentials.twitter.accessToken,
      accessSecret: user.credentials.twitter.accessSecret,
    });

    const content = await GeneratePostContent(user.settings);
    if (!content) {
      NotifyError("Error in Generate PostContent", "Instant Post");
      return res.status(400).json({
        success: false,
        error: {
          message: "Unable to generate post content. Please try again.",
          code: 400
        }
      });
    }
 
    const imagePrompt = await GenerateImagePrompt(content);

    const tweetlimit = content.slice(0, 250);
    const imageBuffer = await GenerateImage(imagePrompt);
    if (!imageBuffer) {
      NotifyError("Image generation failed", "Instant Post");
      return res.status(400).json({
        success: false,
        error: {
          message: "Unable to generate the image. Please try again.",
          code: 400
        }
      });
    }
    
    const fileName = `post-${Date.now()}.jpg`;
    const imageUrl = await UploadImage(imageBuffer, fileName, "twitter");

    const imageResponse = await axios.get(imageUrl, {
      responseType: "arraybuffer",
    });
    const downloadedImageBuffer = imageResponse.data;

    const mediaId = await userTwitterClient.v1.uploadMedia(downloadedImageBuffer, {
      mimeType: "image/jpeg",
    });

    await userTwitterClient.v2.tweet({
      text: tweetlimit,
      media: { media_ids: [mediaId] },
    });

    const post = new TwitterPost({
      text: tweetlimit,
      tobePublishedAt: moment().utc().toDate(),
      isPublished: true,
      img: imageUrl,
      status: "published",
      userId: user._id
    });

    await post.save();
    return res.status(200).json({
      success: true,
      message: "Post created successfully",
    });
  } catch (error) {
    NotifyError(`Error in Instant Post: ${error.message}`, "Instant Post");
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to create post. Please try again later.",
        code: 500,
        detail: error.message
      }
    });
  }
};

exports.CreatePost = async (req, res) => {
  try {
    const { text, tobePublishedAt, action, prompt } = req.body;
    const files = req.files || {};
    let postContent, imageUrl;
    console.log(text, files.img ? files.img[0] : null);

    if (action === "automated") {
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
    const posts = await TwitterPost.find().sort({ tobePublishedAt: -1 });
    
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

    // Sort the grouped array by date in descending order
    groupedPosts.sort((a, b) => moment(b.date).diff(moment(a.date)));

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

exports.GetPostsByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const startDate = moment(date).startOf('day');
    const endDate = moment(date).endOf('day');

    const posts = await TwitterPost.find({
      tobePublishedAt: {
        $gte: startDate.toDate(),
        $lte: endDate.toDate()
      }
    }).sort({ tobePublishedAt: -1 });

    res.status(200).json({
      success: true,
      data: posts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch posts for the specified date"
    });
  }
};
