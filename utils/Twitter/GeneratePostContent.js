const axios = require("axios");

const GeneratePostContent = async (userSettings, prompt) => {
  try {
    console.log(userSettings);

    const response = await axios.post(
      `https://api.generate-content.thesquirrel.site/twitter/create-post/`,
      {
        keywords: userSettings.keywords,
        prompt: prompt,
        description: userSettings.description,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Response received", response.data.tweets.raw);
    return response.data.tweets.raw;
  } catch (error) {
    console.log("Error generating content:", error.message);
    throw error;
  }
};

module.exports = GeneratePostContent;
