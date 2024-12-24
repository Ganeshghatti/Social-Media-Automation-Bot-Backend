const express = require("express");
const connectDatabase = require("./config/database");
const cors = require("cors");
const bodyParser = require("body-parser");
const adminRoutes = require("./routes/Admin");
const dotenv = require("dotenv");
const moment = require("moment");
const momentTimezone = require("moment-timezone");
const { cronPublishPosts } = require("./cron/cronPublishPosts");
const { cronShopifyScrapePosts } = require("./cron/cronShopifyScrapePosts");
const axios = require('axios');
const {testInstagramPost} = require("./utils/InstagramPost");

const envFile = process.env.TWITTER_ENV;
dotenv.config({ path: envFile });

const app = express();

// Middleware setup
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(adminRoutes);

// Function to create a simple text post on LinkedIn
async function createLinkedInPost(accessToken, personId, text) {
  try {
    console.log(accessToken, personId, text);
    const postData = {
      author: `urn:li:person:${personId}`,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: text
          },
          shareMediaCategory: "NONE"
        }
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
      }
    };
    console.log(postData);
    const response = await axios.post(
      'https://api.linkedin.com/v2/ugcPosts',
      postData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      }
    );
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating post:', error.response?.data ||  error.message);
    throw error;
  }
}

// OAuth routes
app.get('/auth/linkedin', (req, res) => {
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
    `response_type=code&` +
    `client_id=${process.env.LINKEDIN_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(process.env.LINKEDIN_REDIRECT_URI)}&` +
    `scope=${encodeURIComponent('openid profile w_member_social')}`;  // Updated scopes
  
  console.log("Redirecting to:", authUrl);
  res.redirect(authUrl);
});

// Callback route
app.get('/auth/linkedin/callback', async (req, res) => {
  const { code, error, error_description } = req.query;
  
  if (error) {
    console.error('LinkedIn OAuth error:', error, error_description);
    return res.status(400).json({ 
      success: false, 
      error: error,
      description: error_description 
    });
  }

  if (!code) {
    console.error('No authorization code received');
    return res.status(400).json({ 
      success: false, 
      error: 'No authorization code received' 
    });
  }

  try {
    console.log("Received authorization code:", code);
    
    // Exchange code for access token
    const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
      params: {
        grant_type: 'authorization_code',
        code: code,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        redirect_uri: process.env.LINKEDIN_REDIRECT_URI
      }
    });

    const accessToken = tokenResponse.data.access_token;
    console.log("Received access token:", accessToken);

    // Use userinfo endpoint instead of /me
    const profileResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const personId = profileResponse.data.sub; // Use 'sub' instead of 'id'
    console.log("Retrieved person info:", profileResponse.data);

    // Create a test post
    const postResponse = await createLinkedInPost(
      accessToken,
      personId,
      'This is a test post from The Squirrel Bot! 🐿️'
    );

    res.json({ 
      success: true, 
      message: 'Posted successfully to LinkedIn!',
      postData: postResponse 
    });

  } catch (error) {
    console.error('LinkedIn Error:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to The Squirrel backend");
});

connectDatabase();
testInstagramPost();
// Set default timezone for the entire application
momentTimezone.tz.setDefault("Asia/Kolkata");
console.log(moment());

// Start the server
const PORT = process.env.PORT || 5000; // Default to 5000 if PORT is not set
const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
