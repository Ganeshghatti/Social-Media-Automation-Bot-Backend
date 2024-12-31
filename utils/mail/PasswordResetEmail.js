const transporter = require("../../config/email");
const passwordResetEmailTemplate = require("./templates/PasswordResetEmail");
require('dotenv').config()
const PasswordResetEmail = async (email, username, resetToken) => {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: [email],
      subject: "Password Reset Request - The Squirrel Bot",
      html: passwordResetEmailTemplate(username, resetToken),
    });
  } catch (error) {
    console.error('Error sending password reset email:', error.message);
  }
};

module.exports = PasswordResetEmail;
