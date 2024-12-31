const nodemailer = require("nodemailer");
const dotenv = require('dotenv');
dotenv.config();

const emailConfig = {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true, 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
};

const transporter = nodemailer.createTransport(emailConfig);
console.debug("Nodemailer transporter created successfully.");

module.exports = transporter;