const LinkedInPost = require("../../models/LinkedinPosts");
const moment = require("moment");
const GeneratePostContent = require("../../utils/Linkedin/GeneratePostContent");
const GenerateImage = require("../../utils/Linkedin/GenerateImage");
const UploadImage = require("../../utils/cloud/UploadImage");
const DeleteImage = require("../../utils/cloud/DeleteImage");
const NotifyError = require("../../utils/mail/NotifyError");
const NotifyInstantPost = require("../../utils/mail/NotifyInstantPost");
const dotenv = require("dotenv");
const credentials = require("../../linkedin-credentials.json");
const axios = require("axios");

const envFile = process.env.SOCIAL_MEDIA_ENV;
dotenv.config({ path: envFile });

exports.InstantPost = async (req, res, next) => {
  try {
    console.log("Starting...");

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
      NotifyError("Error in Generate post", "Instant Post");
      return;
    }

    // Generate and upload image
    const imagePrompt = `Create a professional LinkedIn banner image that represents ${postContent.substring(0, 100)}. Ensure no text in image. Keep one object in center and create clean background.`;
    const imageBuffer = await GenerateImage(imagePrompt);
    if (!imageBuffer) {
      NotifyError("Image generation failed", "Instant Post");
      return;
    }

    const fileName = `post-${Date.now()}.jpg`;
    const imageUrl = await UploadImage(imageBuffer, fileName, "linkedin");

    // Download image for LinkedIn upload
    const imageResponse = await axios.get(imageUrl, {
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
    await axios.put(
      uploadUrl,
      downloadedImageBuffer,
      {
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
          'Content-Type': 'image/jpeg',
        }
      }
    );

    // Create post with image
    const postData = {
      author: `urn:li:person:${credentials.personId}`,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: postContent
          },
          shareMediaCategory: "IMAGE",
          media: [{
            status: "READY",
            description: {
              text: "Post image"
            },
            media: asset,
            title: {
              text: "Post image"
            }
          }]
        }
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
      }
    };

    const response = await axios.post(
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

    const post = new LinkedInPost({
      text: postContent,
      img: imageUrl,
      tobePublishedAt: moment().utc().toDate(),
      isPublished: true,
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
    console.log(error);
    res.status(500).json({
      error: "Failed to create post. Please try again later.",
    });
  }
};

exports.GetAllPosts = async (req, res) => {
  try {
    const posts = await LinkedInPost.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      posts,
    });
  } catch (error) {
    console.error("Error in GetAllPosts:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch posts",
    });
  }
};

exports.EditPost = async (req, res) => {
  try {
    const { id, text, tobePublishedAt } = req.body;
    const files = req.files;

    const post = await LinkedInPost.findById(id);
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
        "linkedin"
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
    const post = await LinkedInPost.findById(id);

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

    await LinkedInPost.findByIdAndDelete(id);

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

exports.CreatePost = async (req, res) => {
  try {
    const { text, tobePublishedAt, action, prompt } = req.body;
    const files = req.files || {};
    let postContent, imageUrl;

    if (action === "automated") {
      const staticPrompt = `
        You are a professional LinkedIn content creator specializing in web development.
        Create an engaging LinkedIn post about web development and SEO.
        
        Requirements:
        - Professional and business-oriented tone
        - Include 2-3 key insights or takeaways
        - Use bullet points for better readability
        - Include relevant statistics if available
        - End with a thought-provoking question
        - Keep it between 3000-4500 characters
        - Add appropriate line breaks
        
        Format:
        [Hook/Attention grabber]
        
        [Main content with insights]
        
        • [Key point 1]
        • [Key point 2]
        • [Key point 3]
        
        [Engaging question]
        
        Return ONLY the post text, nothing else.
      `;

      postContent = await GeneratePostContent(staticPrompt);
      if (!postContent) {
        return res.status(400).json({
          success: false,
          message: "Failed to generate content"
        });
      }

      const imageBuffer = await GenerateImage(`Create a professional LinkedIn banner image that represents ${postContent.substring(0, 100)}. Ensure no text in image. Keep one object in center and create clean background.`);
      const fileName = `post-${Date.now()}.jpg`;
      imageUrl = await UploadImage(imageBuffer, fileName, "linkedin");
    } else if (action === "manual-content") {
      if (!text) {
        return res.status(400).json({
          success: false,
          message: "Text is required"
        });
      }
      postContent = text;
      
      if (files.img && files.img[0]) {
        const fileName = `post-${Date.now()}.jpg`;
        imageUrl = await UploadImage(files.img[0].buffer, fileName, "linkedin");
      }
    }

    let linkedInPostData = {
      author: `urn:li:person:${credentials.personId}`,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: postContent
          },
          shareMediaCategory: imageUrl ? "IMAGE" : "NONE"
        }
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
      }
    };

    // If image exists, add media details
    if (imageUrl) {
      // Download image for LinkedIn upload
      const imageResponse = await axios.get(imageUrl, {
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
      linkedInPostData.specificContent["com.linkedin.ugc.ShareContent"].media = [{
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

    const post = new LinkedInPost({
      text: postContent,
      tobePublishedAt: tobePublishedAt || new Date(),
      isPublished: false,
      img: imageUrl,
      status: "scheduled"
    });

    await post.save();
    NotifyCreatePost(post);

    return res.status(201).json({
      success: true,
      message: "Post created successfully",
      post
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Failed to create post. Please try again later."
    });
  }
};
