const axios = require('axios');

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

    return response.data;
  } catch (error) {
    console.error("Error generating image:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = GenerateImage;
