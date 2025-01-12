const GeminiContent = require("../../utils/content/GeminiContent");
const StableDisffusionImage = require("../../utils/content/StableDisffusionImage");
const User = require("../../models/User");
const axios = require("axios");

// Helper function to update user's image generation count
const updateUserImageCount = async (userId) => {
  try {
    const user = await User.findById(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find today's usage record if it exists
    const todayUsageIndex = user.usage.findIndex(
      (u) => new Date(u.date).toDateString() === today.toDateString()
    );

    if (todayUsageIndex !== -1) {
      // Update existing record for today
      user.usage[todayUsageIndex].image += 1;
    } else {
      // Create new record for today
      user.usage.push({
        date: today,
        text: 0,
        image: 1,
      });
    }

    // Keep only last 30 days of usage data
    user.usage.sort((a, b) => b.date - a.date);
    if (user.usage.length > 30) {
      user.usage = user.usage.slice(0, 30);
    }

    await user.save();
  } catch (error) {
    console.error("Error updating user image count:", error);
  }
};

// Helper function to check user's image generation limit
const checkUserImageLimit = async (userId) => {
  try {
    const user = await User.findById(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find today's usage
    const todayUsage = user.usage.find(
      (u) => new Date(u.date).toDateString() === today.toDateString()
    );

    if (!todayUsage) {
      return true; // No usage today, allow generation
    }

    // Check if under daily limit (50)
    return todayUsage.image < 50;
  } catch (error) {
    console.error("Error checking user limit:", error);
    return false; // Fail safe: deny on error
  }
};

exports.GenerateAIImg = async (req, res) => {
  try {
    const { prompt, postcontent } = req.body;

    // Check rate limit
    const canGenerate = await checkUserImageLimit(req.user._id);
    console.log(canGenerate);
    if (!canGenerate) {
      return res.status(429).json({
        success: false,
        error: {
          message: "Daily image generation limit reached (50/day)",
          code: 429,
        },
      });
    }

    if (!prompt && !postcontent) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Either prompt or postcontent is needed",
          code: 400,
        },
      });
    }

    let enhancedPrompt;
    if (postcontent) {
      enhancedPrompt = await GeminiContent(`
        Create a detailed prompt for Stable Diffusion to generate an image based on this concept: "${postcontent}"
        
        Requirements:
        - Maximum 500 characters
        - Include specific visual elements and composition
        - Describe style, lighting, and atmosphere
        - Specify colors and mood
        - Focus on artistic quality and detail
        - No text or hashtags in the description
        - Make it suitable for AI image generation
        
        Return ONLY the prompt text, nothing else.
      `);

      if (!enhancedPrompt) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Error while generating image",
            code: 400,
          },
        });
      }
    }

    // Generate image using Stable Diffusion
    const imageBuffer = await StableDisffusionImage(prompt || enhancedPrompt);

    // Update user's image count in the background
    setImmediate(() => updateUserImageCount(req.user._id));

    // Send response immediately
    res.set("Content-Type", "image/jpeg");
    res.set("Content-Length", imageBuffer.length);
    return res.status(200).send(imageBuffer);
  } catch (error) {
    console.error("Error in GenerateAIImg:", error);
    res.status(500).json({
      success: false,
      error: {
        status: 500,
        message: error.message,
      },
    });
  }
};

exports.FetchGoogleImage = async (req, res) => {
  try {
    const { prompt, postcontent } = req.body;

    if (!prompt && !postcontent) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Either prompt or postcontent is needed",
          code: 400,
        },
      });
    }
    const canGenerate = await checkUserImageLimit(req.user._id);
    if (!canGenerate) {
      return res.status(429).json({
        success: false,
        error: {
          message: "Daily image generation limit reached (50/day)",
          code: 429,
        },
      });
    }

    let searchQuery;
    if (postcontent) {
      // Generate optimized search query using Gemini
      searchQuery = await GeminiContent(`
      Create a specific and detailed Google image search query based on this concept: "${postcontent}"
      
      Requirements:
      - Keep it concise but descriptive
      - Include relevant keywords
      - Focus on visual aspects
      - No hashtags or special characters
      - Make it suitable for image search
      
      Return ONLY the search query text, nothing else.
    `);

      if (!searchQuery) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Error while generating search query",
            code: 400,
          },
        });
      }
    }
    // Set up Serper API request
    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://google.serper.dev/images",
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      data: {
        q: prompt || searchQuery,
        num: 5, // Number of images to fetch
      },
    };
    setImmediate(() => updateUserImageCount(req.user._id));

    // Make request to Serper API
    const response = await axios.request(config);
    return res.status(200).json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error("Error in FetchGoogleImage:", error);
    return res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 500,
      },
    });
  }
};
