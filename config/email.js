const nodemailer = require("nodemailer");
const dotenv = require('dotenv');
dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

console.log(process.env.SMTP_HOST, process.env.SMTP_PORT, process.env.SMTP_USER, process.env.SMTP_PASSWORD);
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