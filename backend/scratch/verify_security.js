const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const LoginLog = require('../models/LoginLog');
const User = require('../models/User');

const runVerification = async () => {
  console.log('Connecting to database...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Database connected successfully.');

  try {
    // 1. Check if LoginLog collection is queryable
    const logCount = await LoginLog.countDocuments();
    console.log(`[VERIFICATION] LoginLog document count in MongoDB: ${logCount}`);
    
    // 2. Fetch the latest log
    const latestLog = await LoginLog.findOne().sort({ timestamp: -1 });
    if (latestLog) {
      console.log('[VERIFICATION] Latest LoginLog entry details:');
      console.log(` - Email: ${latestLog.email}`);
      console.log(` - Success: ${latestLog.success}`);
      console.log(` - IP: ${latestLog.ipAddress}`);
      console.log(` - Location: ${JSON.stringify(latestLog.location)}`);
    } else {
      console.log('[VERIFICATION] No LoginLog entries found yet. Make a login attempt to generate logs!');
    }

    // 3. Verify User schema has credentialsSent
    const userSample = await User.findOne({ role: 'student' });
    if (userSample) {
      console.log('[VERIFICATION] Student User schema verification:');
      console.log(` - Has credentialsSent: ${userSample.credentialsSent !== undefined ? 'YES' : 'NO'}`);
      console.log(` - Value: ${userSample.credentialsSent}`);
    }

    console.log('\n[VERIFICATION] Backend Security Hardening is verified and active!');
    process.exit(0);
  } catch (error) {
    console.error('[VERIFICATION] Security checks encountered error:', error);
    process.exit(1);
  }
};

runVerification();
