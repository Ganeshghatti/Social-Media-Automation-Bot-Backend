const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const dotenv = require("dotenv");

const envFile = process.env.TWITTER_ENV;
dotenv.config({ path: envFile });

console.log('Environment variables loaded.');

// Instagram Graph API configuration
const config = {
  apiVersion: 'v21.0',
  accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
  businessAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
};

console.log('Instagram API configuration:', config);

// Function to create Instagram post
const createInstagramPost = async (caption, imagePath) => {
  try {
    console.log('Starting Instagram post creation...');
    
    // 1. Create media container with image URL
    const containerResponse = await axios.post(
      `https://graph.facebook.com/${config.apiVersion}/${config.businessAccountId}/media`,
      {
        image_url: 'https://i.ibb.co/YtNZf26/test.jpg', // Using the provided image URL
        caption: caption,
        access_token: config.accessToken
      }
    );

    if (!containerResponse.data?.id) {
      throw new Error('Failed to create media container');
    }

    const containerId = containerResponse.data.id;
    console.log('Media container created:', containerId);

    // 2. Wait for container to be ready
    let status = 'IN_PROGRESS';
    let attempts = 0;
    const maxAttempts = 10;

    while (status === 'IN_PROGRESS' && attempts < maxAttempts) {
      console.log(`Checking status, attempt: ${attempts + 1}`);
      const statusResponse = await axios.get(
        `https://graph.facebook.com/${config.apiVersion}/${containerId}`,
        {
          params: {
            fields: 'status_code',
            access_token: config.accessToken
          }
        }
      );

      status = statusResponse.data.status_code;
      console.log('Container status:', status);

      if (status === 'ERROR') {
        throw new Error('Media container creation failed');
      }

      if (status === 'IN_PROGRESS') {
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      }
    }

    if (status !== 'FINISHED') {
      throw new Error('Media container creation timed out');
    }

    // 3. Publish the post
    const publishResponse = await axios.post(
      `https://graph.facebook.com/${config.apiVersion}/${config.businessAccountId}/media_publish`,
      {
        creation_id: containerId,
        access_token: config.accessToken
      }
    );

    console.log('Post published successfully:', publishResponse.data);

    return {
      success: true,
      postId: publishResponse.data.id,
      message: 'Post created successfully'
    };

  } catch (error) {
    console.error('Instagram posting error:', error.response?.data || error);
    throw new Error(`Failed to create Instagram post: ${error.message}`);
  }
};

// Test function
const testInstagramPost = async () => {
  try {
    const testCaption = 'This is a test post from The Squirrel Bot! 🐿️ #testing #automation';
    const result = await createInstagramPost(testCaption);
    console.log('Test post result:', result);
  } catch (error) {
    console.error('Test post failed:', error);
  }
};

module.exports = {
  createInstagramPost,
  testInstagramPost
}; 