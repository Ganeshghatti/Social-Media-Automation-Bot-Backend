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
            text: text,
          },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };
    console.log(postData);
    const response = await axios.post(
      "https://api.linkedin.com/v2/ugcPosts",
      postData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
      }
    );
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Error creating post:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// OAuth routes
app.get("/auth/linkedin", (req, res) => {
  const authUrl =
    `https://www.linkedin.com/oauth/v2/authorization?` +
    `response_type=code&` +
    `client_id=${process.env.LINKEDIN_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(process.env.LINKEDIN_REDIRECT_URI)}&` +
    `scope=${encodeURIComponent("openid profile w_member_social")}`; // Updated scopes

  console.log("Redirecting to:", authUrl);
  res.redirect(authUrl);
});

// Callback route
app.get("/auth/linkedin/callback", async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    console.error("LinkedIn OAuth error:", error, error_description);
    return res.status(400).json({
      success: false,
      error: error,
      description: error_description,
    });
  }

  if (!code) {
    console.error("No authorization code received");
    return res.status(400).json({
      success: false,
      error: "No authorization code received",
    });
  }

  try {
    console.log("Received authorization code:", code);

    // Exchange code for access token
    const tokenResponse = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      null,
      {
        params: {
          grant_type: "authorization_code",
          code: code,
          client_id: process.env.LINKEDIN_CLIENT_ID,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET,
          redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;
    console.log("Received access token:", accessToken);

    // Use userinfo endpoint instead of /me
    const profileResponse = await axios.get(
      "https://api.linkedin.com/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const personId = profileResponse.data.sub; // Use 'sub' instead of 'id'
    console.log("Retrieved person info:", profileResponse.data);

    // Create a test post
    const postResponse = await createLinkedInPost(
      accessToken,
      personId,
      "This is a test post from The Squirrel Bot! 🐿️"
    );

    res.json({
      success: true,
      message: "Posted successfully to LinkedIn!",
      postData: postResponse,
    });
  } catch (error) {
    console.error("LinkedIn Error:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
});
