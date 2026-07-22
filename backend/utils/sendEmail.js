const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // If DISABLE_EMAIL environment variable is set to true and we don't explicitly override it:
  if (process.env.DISABLE_EMAIL === 'true' && !options.forceSend) {
    console.log('Email functionality is globally disabled via env. Skipping send.');
    return { success: true, message: 'Disabled globally' };
  }

  // Create transporter using SMTP settings
  const host = (process.env.SMTP_HOST || '').trim();
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim();

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    family: 4, // Force IPv4 to avoid ENETUNREACH IPv6 routing issues on cloud containers (like Render)
    connectionTimeout: 10000, // 10 seconds timeout
    greetingTimeout: 10000,
    socketTimeout: 10000,
    auth: {
      user,
      pass,
    },
  });

  // Define email options
  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  // Send email
  const info = await transporter.sendMail(mailOptions);
  console.log('Message sent: %s', info.messageId);
  return info;
};

module.exports = sendEmail;
