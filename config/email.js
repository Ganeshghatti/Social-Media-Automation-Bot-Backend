const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

const envFile = process.env.TWITTER_ENV;
dotenv.config({ path: envFile });

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