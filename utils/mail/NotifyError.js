const transporter = require("../../config/email");
const errorNotificationTemplate = require('./templates/errorNotificationTemplate');

const NotifyError = async (error, source) => {
  try {
    await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: ["info@thesquirrel.site", "ganeshghatti6@gmail.com","aasuy284@gmail.com"],
      subject: `Error Alert: ${source} - ${error}`,
      html: errorNotificationTemplate(error, source),
    });
    console.log('Error notification email sent');
  } catch (emailError) {
    console.error('Failed to send error notification:', emailError);
  }
};

module.exports = NotifyError; 