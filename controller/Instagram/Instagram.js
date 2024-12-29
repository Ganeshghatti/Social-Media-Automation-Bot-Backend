const InstagramPost = require("../../models/InstagramPosts");
const fs = require("fs").promises; // Use promises for better async handling
const moment = require("moment");
const GenerateCaption = require("../../utils/Instagram/GenerateCaption");
const GeneratePostContent = require("../../utils/Instagram/GeneratePostContent");
const CreateImage = require("../../utils/Instagram/CreateImage");
const NotifyError = require("../../utils/mail/NotifyError");
const NotifyInstantPost = require("../../utils/mail/NotifyInstantPost");
const dotenv = require("dotenv");
const path = require("path");
const axios = require("axios"); // Ensure axios is imported
const UploadImage = require("../../utils/cloud/UploadImage");
const DeleteImage = require("../../utils/cloud/DeleteImage");

const envFile = process.env.SOCIAL_MEDIA_ENV;
dotenv.config({ path: envFile });

const config = {
  apiVersion: "v21.0",
  accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
  businessAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID,
};

exports.InstantPost = async (req, res) => {
  try {
    console.log("Starting...");

    const prompt =
      "Create an engaging Instagram post about the importance of SEO, highlighting its benefits in 3-4 concise points.";
    const selectionResponse = await GeneratePostContent(prompt);
    console.log("Raw Gemini response:", selectionResponse);
    if (!selectionResponse) {
      NotifyError("Error in Shortlist posts", "Instant Post");
      return res
        .status(400)
        .json({ success: false, message: "Failed to generate post content." });
    }
    console.log("Post content generated successfully.");
    
    const captionPrompt = `Craft a catchy Instagram caption for this post: ${selectionResponse} Example format: [Catchy title or hook] [hashtags] [call to action] Return ONLY the caption text, nothing else.`;
    const caption = await GenerateCaption(captionPrompt);
    console.log("Generated caption:", caption);
    if (!caption) {
      NotifyError("Error in Generate caption", "Instant Post");
      return res
        .status(400)
        .json({ success: false, message: "Failed to generate caption." });
    }
    console.log("Caption generated successfully.");

    const imageBuffer = await CreateImage(selectionResponse);
    console.log("Image path generated:", imageBuffer);
    if (!imageBuffer) {
      NotifyError("Image generation failed", "Instant Post");
      return res
        .status(500)
        .json({ success: false, message: "Image generation failed." });
    }
    console.log("Image generated successfully.");

    const fileName = `post-${Date.now()}.jpg`;
    const imageurl = await UploadImage(imageBuffer, fileName, "instagram");

    const containerResponse = await axios.post(
      `https://graph.facebook.com/${config.apiVersion}/${config.businessAccountId}/media`,
      {
        image_url: imageurl, // Use the generated image URL
        caption: caption,
        access_token: config.accessToken,
      }
    );

    if (!containerResponse.data?.id) {
      throw new Error("Failed to create media container");
    }

    const containerId = containerResponse.data.id;
    console.log("Media container created:", containerId);

    // 2. Wait for container to be ready
    let status = "IN_PROGRESS";
    let attempts = 0;
    const maxAttempts = 10;

    while (status === "IN_PROGRESS" && attempts < maxAttempts) {
      console.log(`Checking status, attempt: ${attempts + 1}`);
      const statusResponse = await axios.get(
        `https://graph.facebook.com/${config.apiVersion}/${containerId}`,
        {
          params: {
            fields: "status_code",
            access_token: config.accessToken,
          },
        }
      );

      status = statusResponse.data.status_code;
      console.log("Container status:", status);

      if (status === "ERROR") {
        throw new Error("Media container creation failed");
      }

      if (status === "IN_PROGRESS") {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        attempts++;
      }
    }

    if (status !== "FINISHED") {
      throw new Error("Media container creation timed out");
    }

    // 3. Publish the post
    const publishResponse = await axios.post(
      `https://graph.facebook.com/${config.apiVersion}/${config.businessAccountId}/media_publish`,
      {
        creation_id: containerId,
        access_token: config.accessToken,
      }
    );

    console.log("Post published successfully:", publishResponse.data);

    const post = new InstagramPost({
      text: caption,
      tobePublishedAt: moment().utc().toDate(),
      isPublished: true,
      status: "published",
      img: imageurl,
    });

    await post.save();
    console.log("Post saved to database successfully.");
    NotifyInstantPost(post);
    return res.status(201).json({
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

exports.GetAllPosts = async (req, res) => {
  try {
    const posts = await InstagramPost.find().sort({ createdAt: -1 });

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
    
    const post = await InstagramPost.findById(id);
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: "Post not found" 
      });
    }

    if (post.status === "published") {
      return res.status(400).json({ 
        success: false, 
        message: "Published post cannot be edited" 
      });
    }

    // If new image is uploaded, delete old image and upload new one
    if (files && files.img && files.img[0]) {
      if (post.img) {
        await DeleteImage(post.img);
      }
      const fileName = `post-${Date.now()}.jpg`;
      const imageUrl = await UploadImage(files.img[0].buffer, fileName, "instagram");
      post.img = imageUrl;
    }

    post.text = text;
    if (tobePublishedAt) {
      post.tobePublishedAt = tobePublishedAt;
    }
    await post.save();
    
    return res.status(200).json({
      success: true,
      message: "Post updated successfully"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Failed to update post. Please try again later."
    });
  }
};

exports.DeletePost = async (req, res) => {
  try {
    const { id } = req.body;
    const post = await InstagramPost.findById(id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }

    // Delete image from Firebase if exists
    if (post.img) {
      await DeleteImage(post.img);
    }

    await InstagramPost.findByIdAndDelete(id);
    
    return res.status(200).json({
      success: true,
      message: "Post deleted successfully"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Failed to delete post. Please try again later."
    });
  }
};

exports.CreatePost = async (req, res) => {
  try {
    const { text, tobePublishedAt, action, prompt } = req.body;
    const files = req.files;
    let postContent, imageUrl, caption;

    if (action === "automated") {
      const staticPrompt = `
        Create an engaging Instagram post about web development and SEO.
        
        Requirements:
        - Professional and engaging tone
        - Include 2-3 key insights or takeaways
        - Use emojis appropriately
        - Include relevant hashtags
        - Keep it concise and visually appealing
        - Add a clear call-to-action
        
        Format:
        [Hook/Attention grabber]
        
        [Main content with insights]
        
        [Key points with emojis]
        
        [CTA]
        
        [Hashtags]
        
        Return ONLY the post text, nothing else.
      `;

      postContent = await GeneratePostContent(staticPrompt);
      if (!postContent) {
        return res.status(400).json({
          success: false,
          message: "Failed to generate content"
        });
      }

      const imageBuffer = await CreateImage(postContent);
      const fileName = `post-${Date.now()}.jpg`;
      imageUrl = await UploadImage(imageBuffer, fileName, "instagram");
      caption = await GenerateCaption(postContent);

    } else if (action === "manual") {
      if (!text || !files?.img?.[0]) {
        return res.status(400).json({
          success: false,
          message: "Both text and image are required"
        });
      }
      postContent = text;
      caption = text;
      const fileName = `post-${Date.now()}.jpg`;
      imageUrl = await UploadImage(files.img[0].buffer, fileName, "instagram");

    } else if (action === "only-automate-content-with-prompt") {
      if (!prompt || !files?.img?.[0]) {
        return res.status(400).json({
          success: false,
          message: "Both prompt and image are required"
        });
      }
      postContent = await GeneratePostContent(prompt);
      caption = await GenerateCaption(postContent);
      const fileName = `post-${Date.now()}.jpg`;
      imageUrl = await UploadImage(files.img[0].buffer, fileName, "instagram");

    } else if (action === "only-automate-image-with-prompt") {
      if (!text || !prompt) {
        return res.status(400).json({
          success: false,
          message: "Both text and image prompt are required"
        });
      }
      postContent = text;
      caption = text;
      const imageBuffer = await CreateImage(prompt);
      const fileName = `post-${Date.now()}.jpg`;
      imageUrl = await UploadImage(imageBuffer, fileName, "instagram");

    } else if (action === "automate-with-prompt") {
      if (!prompt) {
        return res.status(400).json({
          success: false,
          message: "Prompt is required"
        });
      }
      postContent = await GeneratePostContent(prompt);
      caption = await GenerateCaption(postContent);
      const imageBuffer = await CreateImage(prompt);
      const fileName = `post-${Date.now()}.jpg`;
      imageUrl = await UploadImage(imageBuffer, fileName, "instagram");
    }

    const post = new InstagramPost({
      text: caption,
      tobePublishedAt: tobePublishedAt || moment().utc().toDate(),
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
