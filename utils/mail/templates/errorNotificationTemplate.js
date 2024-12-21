const moment = require('moment');

const errorNotificationTemplate = (error, source) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .error-card { 
            border: 1px solid #dc3545; 
            border-radius: 8px; 
            padding: 20px;
            margin-bottom: 20px;
            background-color: #fff5f5;
          }
          .header { color: #dc3545; }
          .content { margin: 15px 0; }
          .footer { color: #666; margin-top: 20px; }
          .error-badge {
            background-color: #dc3545;
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
          <h2 class="header">Error Notification</h2>
          <div class="error-card">
            <div class="error-badge">Error</div>
            <p><strong>Source:</strong> ${source}</p>
            <p><strong>Time:</strong> ${moment().format('MMMM Do YYYY, h:mm:ss a')}</p>
            <p><strong>Error Message:</strong> ${error}</p>
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

module.exports = errorNotificationTemplate; 