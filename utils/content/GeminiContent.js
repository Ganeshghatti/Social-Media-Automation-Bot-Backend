const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config()

const GeminiContent = async (prompt) => {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Generate text content
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    return response;
  } catch (error) {
    console.error("Error generating content:", error.message);
    throw error;
  }
};

module.exports = GeminiContent;
