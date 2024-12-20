const cron = require("node-cron");
const moment = require("moment");
const GenerateContent = require("../utils/GenerateContent");
const GenerateImage = require("../utils/GenerateImage");
const Post = require("../models/Posts");
const NotifyCreatePost = require("../utils/mail/NotifyCreatePost");

const cronCreatePosts = async (hour, minute, second, millisecond) => {
  try {
    console.log(`Creating posts for ${moment().format('HH:mm:ss')}`);

    for (let i = 0; i < 2; i++) {
      const content = await GenerateContent(
        "Explain how AI works in less than 280 characters."
      );

      if (!content) {
        console.error("No content generated.");
        continue;
      }

      const imagePath = await GenerateImage(content);

      if (!imagePath) {
        console.error("Image generation failed.");
        continue;
      }

      const publishTime = moment().set({
        hour: hour,
        minute: minute,
        second: second,
        millisecond: millisecond
      }).toDate();

      const post = new Post({
        text: content,
        img: imagePath,
        tobePublishedAt: publishTime,
        isPublished: false,
      });

      await post.save();
      console.log(`Post created successfully, scheduled for ${moment(publishTime).format('MMMM Do YYYY, h:mm:ss a')}`);
      
      // Send notification for each post individually
      await NotifyCreatePost(post);
    }
  } catch (error) {
    console.error("Error in Create Posts CronJob:", error.message);
  }
};

// Schedule cron jobs
cron.schedule("51 0 * * *", () => cronCreatePosts(0, 45, 0, 0));
cron.schedule("0 18 * * *", () => cronCreatePosts(18, 0, 0, 0));
cron.schedule("0 19 * * *", () => cronCreatePosts(19, 0, 0, 0));

module.exports = { cronCreatePosts };
