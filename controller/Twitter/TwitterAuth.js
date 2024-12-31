const TwitterApi = require("twitter-api-v2").TwitterApi;
const User = require("../../models/User");
require('dotenv').config()

exports.GetAuthUrl = async (req, res) => {
  try {
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
    });

    const authLink = await client.generateAuthLink(
      `${process.env.BASE_URL}/twitter/callback`,
      { linkMode: "authorize" }
    );
    if (!authLink) {
      return res.status(400).json({
        success: false,
        error: {
          message: "We couldn't generate the authentication link. Please try again later.",
          code: 400,
        },
      });
    }
    // Store in user model instead of session
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: "User not found. Please ensure you are logged in.",
          code: 404,
        },
      });
    }
    user.credentials.twitter.twitterOAuthToken = authLink.oauth_token;
    user.credentials.twitter.twitterOAuthSecret = authLink.oauth_token_secret;
    await user.save();

    res.json({
      success: true,
      message: "Auth URL generated successfully",
      data: authLink.url,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: "An unexpected error occurred. Please try again later.",
        code: 500,
        detail: error.message,
      },
    });
  }
};

exports.HandleCallback = async (req, res) => {
  try {
    const { oauth_token, oauth_verifier } = req.query;

    // Get the user and their stored OAuth secret
    const user = await User.findById(req.user._id);

    if (!user || !user.credentials.twitter.twitterOAuthSecret) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Invalid authentication state. Please try the process again.",
          code: 400,
        },
      });
    }

    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: oauth_token,
      accessSecret: user.credentials.twitter.twitterOAuthSecret,
    });

    const { accessToken, accessSecret, screenName, userId } =
      await client.login(oauth_verifier);

    // Update user's Twitter credentials
    user.credentials.twitter = {
      accessToken,
      accessSecret,
      userId,
      username: screenName,
      isConnected: true,
    };

    // Clear temporary OAuth tokens
    user.credentials.twitter.twitterOAuthToken = undefined;
    user.credentials.twitter.twitterOAuthSecret = undefined;

    await user.save();

    res.json({
      success: true,
      message: "Twitter account connected successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to connect your Twitter account. Please try again later.",
        code: 500,
        detail: error.message,
      },
    });
  }
};

exports.DisconnectTwitter = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.credentials.twitter = {
      accessToken: null,
      accessSecret: null,
      userId: null,
      username: null,
      isConnected: false,
    };
    await user.save();

    res.json({
      success: true,
      message: "Twitter account disconnected successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to disconnect your Twitter account. Please try again later.",
        code: 500,
        detail: error.message,
      },
    });
  }
};
