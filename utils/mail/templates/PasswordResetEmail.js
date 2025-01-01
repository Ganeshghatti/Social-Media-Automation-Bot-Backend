require('dotenv').config()
const passwordResetEmailTemplate = (username, resetToken) => {
  return `
  <!DOCTYPE html>
  <html>
    <head>
    <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); }
    h1 { color: #333; }
    p { color: #555; }
    a { color: #1DA1F2; text-decoration: none; font-weight: bold; }
    a:hover { text-decoration: underline; }
    .footer { margin-top: 20px; font-size: 0.9em; color: #777; }
    </style>
    </head>
    <body>
    <div class="container">
    <img src="https://pilot.thesquirrel.site/logo.png" alt="The Squirrel" style="max-width: 100%; height: auto; border-radius: 8px;" />
    <h1>Reset Your Password</h1>
    <p>Hello ${username},</p>
    <p>We received a request to reset your password. Click the link below to create a new password:</p>
    <p><a href="${process.env.FRONTEND_BASE_URL}/reset-password/${resetToken}">Reset Password</a></p>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request this, please ignore this email.</p>
    <div class="footer">
      <p>Best regards,<br>The Squirrel Team</p>
    </div>
    </div>
    </body>
  </html>
  `;
};

module.exports =  passwordResetEmailTemplate; 