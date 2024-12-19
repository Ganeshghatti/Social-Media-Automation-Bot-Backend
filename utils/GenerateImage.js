const axios = require('axios');
const fs = require('fs/promises');
const path = require('path');
const dotenv = require("dotenv");

const envpath = path.join(__dirname, "..", "api", ".env");
dotenv.config({ path: envpath });

const GenerateImage = async (prompt) => {
  try {
    const response = await axios({
      method: "post",
      url: "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
      headers: {
        Authorization: `Bearer ${process.env.HUGGING_FACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      data: { inputs: prompt },
      responseType: "arraybuffer",
    });

    // Create images directory if it doesn't exist
    const imagesDir = path.join(__dirname, "..", "images");
    await fs.mkdir(imagesDir, { recursive: true });

    // Save the image
    const filename = path.join(imagesDir, `generated-${Date.now()}.png`);
    await fs.writeFile(filename, response.data);

    return filename;
  } catch (error) {
    console.error(
      "Error generating image:",
      error.response?.data || error.message
    );
    throw error;
  }
};

module.exports = GenerateImage;
