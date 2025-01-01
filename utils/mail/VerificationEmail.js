const transporter = require("../../config/email");
const verificationEmailTemplate= require("./templates/VerificationEmail");
require('dotenv').config()
const VerificationEmail = async (email,username, verificationToken) => {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: [email],
      subject: "Verify Your Account - The Squirrel Bot",
      html: verificationEmailTemplate(username, verificationToken),
    });
  } catch (error) {
    console.error('Error sending verification email:', error.message);
  }
};

VerificationEmail("ganeshghatti6@gmail.com", "Ganesh", "1234567890").then(() => {
  console.log("Email sent successfully");
});
module.exports = VerificationEmail;
