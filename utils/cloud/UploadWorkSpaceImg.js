const { ref, uploadBytes, getDownloadURL } = require("firebase/storage");
const { storage } = require("../../config/firebase");

const UploadWorkSpaceImg = async (buffer, fileName,userId) => {
  try {
    const filePath = `images/workspace/${userId}/${fileName}`;
    
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

module.exports = UploadWorkSpaceImg;