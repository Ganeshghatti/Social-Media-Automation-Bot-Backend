const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: `.env.${process.env.NODE_ENV}` })

const GenerateImagePrompt = async (prompt) => {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Generate a prompt for stable diffusion image generation
    const result = await model.generateContent(
        `Create a detailed prompt not more than 500 characters for the Stable Diffusion model to generate an image based on the following concept: "${prompt}". The prompt should include specific visual elements, styles, and colors to ensure a high-quality image output. The prompt shouldn't include any texts or hashtags.`
    );
    const response = result.response.text();
    return response;
  } catch (error) {
    console.error("Error generating content:", error.message);
    throw error;
  }
};

module.exports = GenerateImagePrompt;
