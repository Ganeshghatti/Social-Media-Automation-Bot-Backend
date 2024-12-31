const transporter = require("../../config/email");
const instantPostTemplate = require("./templates/instantPostTemplate");
const path = require("path");
require('dotenv').config({ path: `.env.${process.env.NODE_ENV}` })
const NotifyInstantPost = async (post) => {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: ["info@thesquirrel.site", "ganeshghatti6@gmail.com","aasuy284@gmail.com"],
      subject: "New Post Created - The Squirrel Bot",
      html: instantPostTemplate(post),
      attachments: [{
        filename: path.basename(post.img),
        path: post.img,
        cid: 'postimage'
      }]
    });
    console.log('Instant post notification email sent successfully for post');
  } catch (error) {
    console.error('Error sending instant post notification email:', error.message);
  }
};

module.exports = NotifyInstantPost;
