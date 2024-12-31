const moment = require('moment');

const publishedPostEmailTemplate = (post) => {
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
            background-color: #f8f9fa;
          }
          .header { color: #1DA1F2; }
          .content { margin: 15px 0; }
          .image { max-width: 100%; border-radius: 8px; }
          .footer { color: #666; margin-top: 20px; }
          .success-badge {
            background-color: #28a745;
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            display: inline-block;
            margin-bottom: 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2 class="header">Post Published Successfully</h2>
          <div class="post-card">
            <div class="success-badge">Published</div>
            <p><strong>Content:</strong> ${post.text}</p>
            <p><strong>Published at:</strong> ${moment().format('MMMM Do YYYY, h:mm:ss a')}</p>
            <div class="content">
              <img src="cid:postimage" alt="Published Image" class="image">
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

module.exports = publishedPostEmailTemplate; 