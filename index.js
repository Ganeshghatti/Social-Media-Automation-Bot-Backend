require("dotenv").config();
const { TwitterApi } = require("twitter-api-v2");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

// Your Twitter API credentials
const TwitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

const rwClient = TwitterClient.readWrite;

const createTweetWithGeminiContentAndImage = async () => {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Generate text content
    const prompt = "Explain how AI works in less than 280 characters.";
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    console.log("Response received");

    // Ensure the response is under 280 characters
    if (response.length > 280) {
      console.error(
        "Generated content exceeds Twitter's character limit of 280 characters."
      );
      return;
    }

    // Upload media to Twitter
    const mediaId = await TwitterClient.v1.uploadMedia('./test.png');
    await rwClient.v2.tweet({
      text: response,
      media: { media_ids: [mediaId] },
    });
    console.log("Tweet posted successfully with image");

  } catch (error) {
    console.error("Error posting tweet:", error);
  }
};
createTweetWithGeminiContentAndImage()