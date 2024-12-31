const path = require("path");
const { createCanvas, loadImage } = require("canvas");

const templatePath = path.join(__dirname, '..', '..', 'templates', 'Instagram', 'DemoTemplate.png');

const CreateImage = async (text) => {
  try {
    const canvas = createCanvas(1080, 1080);
    const ctx = canvas.getContext("2d");

    const template = await loadImage(templatePath);
    ctx.drawImage(template, 0, 0);

    ctx.font = "bold 48px Arial";
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    // Convert canvas to buffer (JPEG format)
    const buffer = canvas.toBuffer("image/jpeg", { quality: 0.9 });

    return buffer;
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};

module.exports = CreateImage;
