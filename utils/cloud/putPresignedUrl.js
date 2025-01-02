const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const s3Client = require("../../config/aws");
require('dotenv').config();

const putPresignedUrl = async (key, expiresIn = 3600) => {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    ContentType: "application/octet-stream",
  });
  const url = await getSignedUrl(s3Client, command, { expiresIn });
  return url;
};

module.exports = putPresignedUrl;
