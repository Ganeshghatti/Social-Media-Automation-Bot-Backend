const LinkedInPost = require("../../models/LinkedinPosts");
const moment = require("moment");
const GeneratePostContent = require("../../utils/Linkedin/GeneratePostContent");
const NotifyError = require("../../utils/mail/NotifyError");
const NotifyInstantPost = require("../../utils/mail/NotifyInstantPost");
const dotenv = require("dotenv");
const credentials = require("../../linkedin-credentials.json");
const axios = require("axios");

const envFile = process.env.SOCIAL_MEDIA_ENV;
dotenv.config({ path: envFile });

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
    console.log("Generated post:", postContent);
    if (!postContent) {
      NotifyError("Error in Generate post", "Instant Post");
      return;
    }

    const postData = {
      author: `urn:li:person:${credentials.personId}`,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: postContent,
          },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
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
    console.log(response);
    const post = new LinkedInPost({
      text: postContent,
      tobePublishedAt: moment().tz("Asia/Kolkata").toDate(),
      isPublished: true,
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
