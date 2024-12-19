const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
const path = require("path");

const envpath = path.join(__dirname, "..", "api", ".env");
dotenv.config({ path: envpath });

const GenerateContent = async (prompt) => {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Generate text content
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    console.log("Response received");

    if (response.length > 280) {
      console.error(
        "Generated content exceeds Twitter's character limit of 280 characters."
      );
      return;
    }
    return response;
  } catch (error) {
    console.error("Error generating content:", error.message);
    throw error;
  }
};

module.exports = GenerateContent;
