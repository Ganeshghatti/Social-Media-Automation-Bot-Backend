const transporter = require("../../config/email");
const publishedPostEmailTemplate = require("./templates/publishPostTemplate");
const path = require("path");
require('dotenv').config()
const NotifyPublishPost = async (post) => {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: ["info@thesquirrel.site", "ganeshghatti6@gmail.com","aasuy284@gmail.com"],
      subject: "Post Published Successfully - The Squirrel Bot",
      html: publishedPostEmailTemplate(post),
      attachments: [{
        filename: path.basename(post.img),
        path: post.img,
        cid: 'postimage'
      }]
    });
    console.log('Publication notification email sent successfully');
  } catch (error) {
    console.error('Error sending publish notification email:', error.message);
  }
};

module.exports = NotifyPublishPost; 