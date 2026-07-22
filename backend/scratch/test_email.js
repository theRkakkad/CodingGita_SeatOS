const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

const sendEmail = require('../utils/sendEmail');

const runTest = async () => {
  console.log('Starting SMTP Email Test...');
  console.log(`SMTP User: ${process.env.SMTP_USER}`);
  console.log(`SMTP Host: ${process.env.SMTP_HOST}`);
  
  try {
    const info = await sendEmail({
      email: 'kakkadrachit1@gmail.com',
      subject: 'CodingGita SeatSync - SMTP Test Email',
      text: 'Hello Rachit! If you receive this, the email SMTP system is fully active and working.',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0b071a; color: #ffffff; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.1);">
          <h2 style="color: #f9ca3a;">SMTP Server Connection: SUCCESS!</h2>
          <p>Hello <strong>Rachit</strong>,</p>
          <p>This is a live test verifying that the email server is fully active and communicating with Gmail's SMTP service.</p>
          <p style="font-size: 11px; color: #a78bfa;">Sent at: ${new Date().toLocaleString()}</p>
        </div>
      `,
      forceSend: true // Bypass safety block to send test
    });
    
    console.log('Email test completed successfully!');
    console.log(info);
    process.exit(0);
  } catch (error) {
    console.error('Email test failed with error:', error);
    process.exit(1);
  }
};

runTest();
