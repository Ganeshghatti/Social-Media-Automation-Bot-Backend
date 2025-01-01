const WorkSpace = require("../../../models/WorkSpace");
const User = require("../../../models/User");
const OAuthState = require("../../../models/OAuthState");
const checkWorkspaceOwnership = require("../../../utils/checkWorkspaceOwnership");
const moment = require("moment");
require("dotenv").config();
const TwitterApi = require("twitter-api-v2").TwitterApi;

exports.ConnectTwitter = async (req, res) => {
  try {
    const workSpaceId = req.params.workSpaceId;

    // Check workspace ownership
    const workspace = await checkWorkspaceOwnership(workSpaceId, req.user._id);
    if (!workspace) {
      return res.status(403).json({
        success: false,
        error: {
          message: "You don't have access to this workspace",
          code: 403,
        },
      });
    }

    const user = await User.findById(req.user._id);

    // Check subscription limits
    if (user.subscription === "free") {
      const workspaceCount = await WorkSpace.countDocuments({
        userId: req.user._id,
      });
      if (workspaceCount > 1) {
        return res.status(403).json({
          success: false,
          error: {
            message: "Free tier users can only create one workspace",
            code: 403,
          },
        });
      }

      const connectedAccountsCount = workspace.connectedAccounts.length;
      if (connectedAccountsCount >= 1) {
        return res.status(403).json({
          success: false,
          error: {
            message:
              "Free tier users can only connect one social media account",
            code: 403,
          },
        });
      }
    }
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
    });

    const authLink = await client.generateAuthLink(
      `${process.env.BACKEND_BASE_URL}/workspace/twitter/callback`,
      {
        linkMode: "authorize",
      }
    );
    // Store OAuth state in database
    const oauthState = new OAuthState({
      workspaceId: workSpaceId,
      userId: req.user._id,
      type: "twitter",
      credentials: {
        twitterOAuthToken: authLink.oauth_token,
        twitterOAuthSecret: authLink.oauth_token_secret,
      },
      createdAt: moment().format(),
    });

    await oauthState.save();

    res.json({
      success: true,
      message: "Auth URL generated successfully",
      data: authLink.url,
    });
  } catch (error) {
    console.log(error);
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
    const { oauth_token, oauth_verifier, denied } = req.query;

    // Handle authorization denial
    if (denied) {
      const oauthState = await OAuthState.findOne({
        "credentials.twitterOAuthToken": denied,
      });

      if (oauthState) {
        // Clean up the OAuth state
        await OAuthState.deleteOne({ _id: oauthState._id });

        // Redirect to frontend with error parameter
        return res.redirect(
          `${process.env.FRONTEND_BASE_URL}/workspace/${oauthState.workspaceId}?error=auth_denied`
        );
      }
    }

    // Regular authorization flow
    if (!oauth_token || !oauth_verifier) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Invalid callback parameters",
          code: 400,
        },
      });
    }

    // Find the stored OAuth state with nested credentials query
    const oauthState = await OAuthState.findOne({
      "credentials.twitterOAuthToken": oauth_token,
    });

    if (!oauthState) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Invalid OAuth state",
          code: 400,
        },
      });
    }

    const workspace = await checkWorkspaceOwnership(
      oauthState.workspaceId,
      oauthState.userId
    );

    if (!workspace) {
      await OAuthState.deleteOne({ _id: oauthState._id });
      return res.status(403).json({
        success: false,
        error: {
          message: "Invalid authentication state",
          code: 403,
        },
      });
    }

    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: oauth_token,
      accessSecret: oauthState.credentials.twitterOAuthSecret,
    });

    const {
      accessToken,
      accessSecret,
      screenName,
      userId: twitterUserId,
    } = await client.login(oauth_verifier);

    // Add the Twitter account to workspace
    workspace.connectedAccounts.push({
      type: "twitter",
      credentials: {
        accessToken,
        accessSecret,
        userId: twitterUserId,
        username: screenName,
      },
      isConnected: true,
    });

    await workspace.save();

    // Clean up the OAuth state
    await OAuthState.deleteOne({ _id: oauthState._id });

    res.redirect(
      `${process.env.FRONTEND_BASE_URL}/workspace/${oauthState.workspaceId}?success=true`
    );
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message:
          "Failed to connect your Twitter account. Please try again later.",
        code: 500,
        detail: error.message,
      },
    });
  }
};

exports.DisconnectTwitter = async (req, res) => {
  try {
    const { workspaceId, accountId } = req.params;

    // Verify workspace ownership
    const workspace = await checkWorkspaceOwnership(workspaceId, req.user._id);
    if (!workspace) {
      return res.status(403).json({
        success: false,
        error: {
          message: "You don't have access to this workspace",
          code: 403,
        },
      });
    }

    // Find and remove the account
    const accountIndex = workspace.connectedAccounts.findIndex(
      (account) => account.credentials.userId.toString() === accountId
    );
    if (accountIndex === -1) {
      return res.status(404).json({
        success: false,
        error: {
          message: "Account not found",
          code: 404,
        },
      });
    }

    workspace.connectedAccounts.splice(accountIndex, 1);
    await workspace.save();

    res.json({
      success: true,
      message: "Twitter account disconnected successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to disconnect Twitter account",
        code: 500,
        detail: error.message,
      },
    });
  }
};
