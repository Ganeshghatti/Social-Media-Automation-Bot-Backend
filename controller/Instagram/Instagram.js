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

const envFile = process.env.SOCIAL_MEDIA_ENV;
dotenv.config({ path: envFile });

const config = {
  apiVersion: "v21.0",
  accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
  businessAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID,
};

exports.GetAllPosts = async (req, res) => {
  try {
    const posts = await InstagramPost.find().sort({ createdAt: -1 });

    const postsWithImages = await Promise.all(
      posts.map(async (post) => {
        const postObj = post.toObject();
        try {
          const imageBuffer = await fs.readFile(post.img);
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

exports.InstantPost = async (req, res) => {
  try {
    console.log("Starting...");

    const prompt =
      "Write an Instagram post with title: importance of SEO, and 3-4 points about it.";
    const selectionResponse = await GeneratePostContent(prompt);
    console.log("Raw Gemini response:", selectionResponse);
    if (!selectionResponse) {
      NotifyError("Error in Shortlist posts", "Instant Post");
      return res
        .status(400)
        .json({ success: false, message: "Failed to generate post content." });
    }
    console.log("Post content generated successfully.");

    const captionPrompt = `Write a good Instagram caption for the following post: ${selectionResponse}`;
    const caption = await GenerateCaption(captionPrompt);
    console.log("Generated caption:", caption);
    if (!caption) {
      NotifyError("Error in Generate caption", "Instant Post");
      return res
        .status(400)
        .json({ success: false, message: "Failed to generate caption." });
    }
    console.log("Caption generated successfully.");

    const imageurl = await CreateImage(selectionResponse);
    console.log("Image path generated:", imageurl);
    if (!imageurl) {
      NotifyError("Image generation failed", "Instant Post");
      return res
        .status(500)
        .json({ success: false, message: "Image generation failed." });
    }
    console.log("Image generated successfully.");

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
      tobePublishedAt: moment().tz("Asia/Kolkata").toDate(),
      isPublished: true,
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
