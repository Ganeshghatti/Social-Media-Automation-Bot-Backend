const { ref, deleteObject } = require("firebase/storage");
const { storage } = require("../../config/firebase");

const DeleteImage = async (imageUrl) => {
  try {
    // Extract the file path from the URL
    const baseUrl = "https://firebasestorage.googleapis.com/v0/b/";
    const imagePath = imageUrl.split(baseUrl)[1].split('?')[0];
    const decodedPath = decodeURIComponent(imagePath.split('/o/')[1]);
    console.log(decodedPath);
    // Create reference and delete
    const imageRef = ref(storage, decodedPath);
    await deleteObject(imageRef);
    console.log("Image deleted successfully");
    return true;
  } catch (error) {
    console.error("Error deleting image:", error);
    return false;
  }
};

module.exports = DeleteImage; 