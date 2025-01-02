const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const s3Client = require("../../config/aws");
require("dotenv").config();

const DeleteS3Image = async (key) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error("Error deleting image from S3:", error);
    return false;
  }
};

module.exports = DeleteS3Image;
