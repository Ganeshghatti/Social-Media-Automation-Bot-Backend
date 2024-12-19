require("dotenv").config();
const { TwitterApi } = require("twitter-api-v2");
const path = require("path");

// Your Twitter API credentials
const client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    bearerToken: process.env.TWITTER_BEARER_TOKEN,
});

const rwClient = client.readWrite;

// Create a tweet with an image
const createTweetWithImage = async () => {
    try {
        const mediaId = await client.v1.uploadMedia(path.join(__dirname, 'test.png'));
        await rwClient.v2.tweet({
            text: "Twitter is a fantastic social network. Look at this:",
            media: { media_ids: [mediaId] },
        });
        console.log("success");
    } catch (error) {
        console.error(error);
    }
};

// Call the function
createTweetWithImage();