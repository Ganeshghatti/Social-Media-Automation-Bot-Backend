const moment = require('moment');

const createPostEmailTemplate = (post) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .post-card { 
            border: 1px solid #ddd; 
            border-radius: 8px; 
            padding: 20px;
            margin-bottom: 20px;
          }
          .header { color: #1DA1F2; }
          .content { margin: 15px 0; }
          .image { max-width: 100%; border-radius: 8px; }
          .footer { color: #666; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2 class="header">New Post Created</h2>
          <div class="post-card">
            <p><strong>Content:</strong> ${post.text}</p>
            <p><strong>Scheduled for:</strong> ${moment(post.tobePublishedAt).format('MMMM Do YYYY, h:mm:ss a')}</p>
            <div class="content">
              <img src="cid:postimage" alt="Post Image" class="image">
            </div>
          </div>
          <div class="footer">
            Best regards,<br>
            The Squirrel Bot
          </div>
        </div>
      </body>
    </html>
  `;
};

module.exports = createPostEmailTemplate; 