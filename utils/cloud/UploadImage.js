const { ref, uploadBytes, getDownloadURL } = require("firebase/storage");
const { storage } = require("../../config/firebase");

const UploadImage = async (buffer, fileName, socialMediaName) => {
  try {
    // Create today's date for folder structure
    const today = new Date().toISOString().split('T')[0];
    const filePath = `images/${socialMediaName}/${today}/${fileName}`;
    
    // Create storage reference
    const storageRef = ref(storage, filePath);
    
    // Upload the buffer
    await uploadBytes(storageRef, buffer);
    
    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
};

module.exports = UploadImage;
