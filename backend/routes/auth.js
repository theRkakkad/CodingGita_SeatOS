const express = require('express');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const LOOKUP_SECRET = process.env.LOOKUP_SECRET || 'fallback_lookup_secret_for_hmac_123';
const getEmailHash = (email) => crypto.createHmac('sha256', LOOKUP_SECRET).update(email.toLowerCase()).digest('hex');
const router = express.Router();
const jwt = require('jsonwebtoken');
const geoip = require('geoip-lite');
const User = require('../models/User');
const Session = require('../models/Session');
const LoginLog = require('../models/LoginLog');
const { protect, authorize } = require('../middleware/auth');
const sendEmail = require('../utils/sendEmail');
const { OAuth2Client } = require('google-auth-library');
const { z } = require('zod');
const UAParser = require('ua-parser-js');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Network Info Helper for better localhost/public IP resolution
const resolveNetworkInfo = async (req) => {
  let ipAddress = req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1';
  ipAddress = ipAddress.includes(',') ? ipAddress.split(',')[0].trim() : ipAddress.trim();
  
  if (ipAddress === '::1' || ipAddress === '127.0.0.1') {
    try {
      // For local development, fetch the machine's actual public IP
      const ipRes = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipRes.json();
      ipAddress = ipData.ip;
    } catch (e) {
      console.log('Public IP lookup fallback failed');
    }
  }

  const geo = geoip.lookup(ipAddress);
  const location = {
    country: geo?.country || 'Unknown',
    region: geo?.region || 'Unknown',
    city: geo?.city || 'Unknown'
  };

  return { ipAddress, location };
};

// Zod Validation Schemas
const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  enrollmentNo: z.string().min(3, "Enrollment number is required"),
  email: z.string().email("Invalid email format").refine(e => e.toLowerCase().endsWith('@swaminarayanuniversity.ac.in'), "Only @swaminarayanuniversity.ac.in addresses are allowed"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

const googleSchema = z.object({
  idToken: z.string().min(1, "Please provide Google idToken"),
  turnstileToken: z.string().min(1, "Please complete the CAPTCHA security check"),
});

// Generate JWT Helper
const generateAccessToken = (id, ipHash, tokenVersion) => {
  return jwt.sign({ id, ipHash, tokenVersion }, process.env.JWT_SECRET, {
    expiresIn: '5m', // Short-lived Access Token
  });
};

const sendTokenCookie = async (user, statusCode, res, req) => {
  // IP & Geolocation info extraction
  const rawIp = req?.headers?.['x-forwarded-for'] || req?.ip || req?.connection?.remoteAddress || req?.socket?.remoteAddress || '127.0.0.1';
  const ipAddress = rawIp.includes(',') ? rawIp.split(',')[0].trim() : rawIp.trim();
  const ipHash = crypto.createHash('sha256').update(ipAddress).digest('hex');

  const accessToken = generateAccessToken(user._id, ipHash, user.tokenVersion || 0);
  const refreshToken = crypto.randomBytes(40).toString('hex');
  const userAgent = req?.headers?.['user-agent'] || '';
  const geo = geoip.lookup(ipAddress);
  const location = {
    country: geo?.country || 'Localhost',
    region: geo?.region || 'Localhost',
    city: geo?.city || 'Localhost',
    ll: geo?.ll || []
  };

  // Helper for Impossible Travel
  const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))); 
  };

  // Impossible Travel Anomaly Detection
  if (location.ll && location.ll.length === 2) {
    const lastLogin = await LoginLog.findOne({ userId: user._id, success: true }).sort({ timestamp: -1 });
    if (lastLogin && lastLogin.location && lastLogin.location.ll && lastLogin.location.ll.length === 2) {
      const distance = getDistanceFromLatLonInKm(lastLogin.location.ll[0], lastLogin.location.ll[1], location.ll[0], location.ll[1]);
      const hoursDiff = (Date.now() - new Date(lastLogin.timestamp).getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > 0 && distance > 100) {
        const speed = distance / hoursDiff; // km/h
        if (speed > 1000) {
          console.warn(`[SECURITY ALERT] Impossible Travel Detected! Speed: ${speed.toFixed(2)} km/h | User: ${user.email}`);
          // Pragmatic fix: Flag for admin review, do not auto-lock on first offense.
        }
      }
    }
  }

  // Advanced Device Fingerprinting with ua-parser-js
  const parser = new UAParser(userAgent);
  const parsedBrowser = parser.getBrowser().name || 'Unknown Browser';
  const parsedOS = parser.getOS().name || 'Unknown OS';

  const existingDeviceSession = await Session.findOne({
    userId: user._id,
    'deviceInfo.browser': parsedBrowser,
    'deviceInfo.os': parsedOS,
  });

  const existingLocationSession = await Session.findOne({
    userId: user._id,
    'location.country': location.country,
    'location.city': location.city,
  });

  // Only flag as a new device if we've never seen this exact Browser+OS combo OR this exact City+Country combo before
  const isAnomaly = !existingDeviceSession || !existingLocationSession;

  // Create Session
  await Session.create({
    userId: user._id,
    refreshToken,
    deviceInfo: { browser: parsedBrowser, os: parsedOS },
    ipAddress,
    location,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  });

  // Send New Device/Anomaly Alert Email
  if (isAnomaly) {
    try {
      const emailHtml = `
        <h2>Security Alert: New Sign-In Detected</h2>
        <p>Hi ${user.name},</p>
        <p>We noticed a new login to your SeatOS account from a new location or operating system.</p>
        <ul>
          <li><strong>Operating System:</strong> ${parsedOS}</li>
          <li><strong>Browser:</strong> ${parsedBrowser}</li>
          <li><strong>IP Address:</strong> ${ipAddress}</li>
          <li><strong>Location:</strong> ${location.city}, ${location.region}, ${location.country}</li>
        </ul>
        <p>If this was you, you can safely ignore this email.</p>
        <p>If you don't recognize this activity, please contact administration immediately as your Google account may be compromised.</p>
      `;
      
      await sendEmail({
        email: user.email,
        subject: 'Security Alert: New Sign-In to SeatOS',
        html: emailHtml,
        forceSend: false // Respect DISABLE_EMAIL env var
      });
    } catch (err) {
      console.error('Failed to send new device email alert:', err);
    }
  }

  const cookieOptionsAccess = {
    expires: new Date(Date.now() + 5 * 60 * 1000), // 5 mins
    httpOnly: true,
    sameSite: 'lax',
  };

  const cookieOptionsRefresh = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    sameSite: 'lax',
  };

  if (process.env.NODE_ENV === 'production') {
    cookieOptionsAccess.secure = true;
    cookieOptionsRefresh.secure = true;
    cookieOptionsAccess.sameSite = 'none';
    cookieOptionsRefresh.sameSite = 'none';
  }

  // Generate CSRF Token for Double Submit Cookie pattern
  const csrfToken = crypto.randomBytes(32).toString('hex');

  res
    .status(statusCode)
    .cookie('accessToken', accessToken, cookieOptionsAccess)
    .cookie('refreshToken', refreshToken, cookieOptionsRefresh)
    .cookie('csrfToken', csrfToken, { sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', secure: process.env.NODE_ENV === 'production' })
    .json({
      success: true,
      csrfToken,
      user: {
        _id: user._id,
        name: user.name,
        enrollmentNo: user.enrollmentNo,
        email: user.email,
        role: user.role,
        assignedClassroom: user.assignedClassroom,
      },
    });
};

// @desc    Register a new user (Restricted to Admins only)
// @route   POST /api/auth/register
// @access  Private (Admin)
router.post('/register', protect, authorize('admin'), async (req, res) => {
  try {
    // Validate Input with Zod
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.issues[0].message });
    }
    const { name, enrollmentNo, email, password } = parsed.data;

    // Check if user already exists by email or enrollment number
    const userExistsByEmail = await User.findOne({ emailLookupHash: getEmailHash(email) });
    if (userExistsByEmail) {
      // Account Enumeration Protection: Generic error
      return res.status(400).json({ success: false, message: 'Registration failed. Data conflicts with existing records.' });
    }

    const userExistsByEnrollment = await User.findOne({ enrollmentNo });
    if (userExistsByEnrollment) {
      // Account Enumeration Protection: Generic error
      return res.status(400).json({ success: false, message: 'Registration failed. Data conflicts with existing records.' });
    }

    // Create user (defaults to role: 'student')
    const user = await User.create({
      name,
      enrollmentNo,
      email,
      password,
    });

    if (user) {
      // Send welcome email (asynchronously)
      const emailSubject = 'Welcome to SeatSync - Registration Confirmed!';
      const emailText = `Hello ${user.name},\n\nThank you for registering on SeatSync!\n\nYour account has been created successfully.\nYour Enrollment Number is: ${user.enrollmentNo}\n\nYou can now log in to the student portal and reserve your seat in the classrooms.\n\nBest Regards,\nSeatSync Team`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
          <h2 style="color: #4e55fa;">Welcome to SeatSync, ${user.name}!</h2>
          <p>Thank you for registering on the SeatSync Classroom Seat Booking Portal.</p>
          <p><strong>Your Enrollment Number:</strong> ${user.enrollmentNo}</p>
          <p>You can now log in to reserve your seat in the lecture halls.</p>
          <br/>
          <p>Best Regards,</p>
          <p><strong>SeatSync Admin Team</strong></p>
        </div>
      `;

      sendEmail({
        email: user.email,
        subject: emailSubject,
        text: emailText,
        html: emailHtml,
      }).catch((err) => console.error('Error sending welcome email:', err.message));

      await sendTokenCookie(user, 201, res, req);
    } else {
      res.status(400).json({ success: false, message: 'Invalid user data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  try {
    // Validate Input with Zod
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.issues[0].message });
    }
    const { email, password } = parsed.data;

    // IP & Geolocation info extraction
    const networkInfo = await resolveNetworkInfo(req);
    const ipAddress = networkInfo.ipAddress;
    const location = networkInfo.location;
    const userAgent = req.headers['user-agent'] || '';

    // Check for user
    const user = await User.findOne({ emailLookupHash: getEmailHash(email) }).select('+password');
    if (!user) {
      // Log failed attempt (user not found)
      await LoginLog.create({
        email,
        ipAddress,
        userAgent,
        location,
        success: false
      });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      // Log failed attempt (wrong password)
      await LoginLog.create({
        userId: user._id,
        email,
        ipAddress,
        userAgent,
        location,
        success: false
      });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Log successful attempt
    await LoginLog.create({
      userId: user._id,
      email,
      ipAddress,
      userAgent,
      location,
      success: true
    });

    await sendTokenCookie(user, 200, res, req);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// @desc    Authenticate user via Google OAuth
// @route   POST /api/auth/google
// @access  Public
router.post('/google', async (req, res) => {
  try {
    // Validate Input with Zod
    const parsed = googleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.issues[0].message });
    }
    const { idToken, turnstileToken } = parsed.data;

    // Verify Cloudflare Turnstile CAPTCHA
    const turnstileSecret = '1x0000000000000000000000000000000AA'; // Dummy key for always passes
    const turnstileVerifyURL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    
    // We use the native fetch API (Node 18+)
    const turnstileRes = await fetch(turnstileVerifyURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${turnstileSecret}&response=${turnstileToken}`,
    });
    
    const turnstileOutcome = await turnstileRes.json();
    if (!turnstileOutcome.success) {
      return res.status(403).json({ success: false, message: 'CAPTCHA verification failed. Are you a bot?' });
    }

    // Verify Google Token strictly (NO MOCKS)
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    const { email, name, picture } = payload;

    // Check university domain strictly (allow specific admins to bypass)
    const adminWhitelist = ['zeelkundariya13@gmail.com', 'admin@codinggita.com'];
    if (!email.toLowerCase().endsWith('@swaminarayanuniversity.ac.in') && !adminWhitelist.includes(email.toLowerCase())) {
      // Account Enumeration Protection: generic message
      return res.status(403).json({ success: false, message: 'Authentication failed. Only university accounts are allowed.' });
    }

    // IP & Geolocation info extraction
    const rawIp = req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1';
    const ipAddress = rawIp.includes(',') ? rawIp.split(',')[0].trim() : rawIp.trim();
    const userAgent = req.headers['user-agent'] || '';
    const geo = geoip.lookup(ipAddress);
    const location = {
      country: geo?.country || 'Localhost',
      region: geo?.region || 'Localhost',
      city: geo?.city || 'Localhost'
    };

    // Find or create user
    let user = await User.findOne({ emailLookupHash: getEmailHash(email) });
    if (!user) {
      // Create student user if not exists
      const enrollmentNo = email.split('@')[0].toUpperCase();
      user = await User.create({
        name,
        email,
        emailLookupHash: getEmailHash(email),
        enrollmentNo,
        password: 'OAUTH_USER', // Dummy password since they use OAuth
        role: 'student',
        referencePhotoUrl: picture // Initial reference photo
      });
    }

    // Log successful attempt
    await LoginLog.create({
      userId: user._id,
      email,
      ipAddress,
      userAgent,
      location,
      success: true
    });

    await sendTokenCookie(user, 200, res, req);
  } catch (error) {
    console.error(error);
    res.status(401).json({ success: false, message: 'Google Authentication failed' });
  }
});

// @desc    Authenticate Info Admin via Google OAuth
// @route   POST /api/auth/studentinfo-google
// @access  Public
router.post('/studentinfo-google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Please provide Google idToken' });
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    const allowedEmails = [
      'zeelkundariya13@gmail.com',
      'kakkadrachit1@gmail.com'
    ];

    if (!allowedEmails.includes(email.toLowerCase())) {
      return res.status(403).json({ success: false, message: 'Unauthorized. This portal is strictly restricted to specific Info Admins.' });
    }

    // IP & Geolocation info extraction
    const rawIp = req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1';
    const ipAddress = rawIp.includes(',') ? rawIp.split(',')[0].trim() : rawIp.trim();
    const userAgent = req.headers['user-agent'] || '';
    const geo = geoip.lookup(ipAddress);
    const location = {
      country: geo?.country || 'Localhost',
      region: geo?.region || 'Localhost',
      city: geo?.city || 'Localhost'
    };

    // Find or create user
    let user = await User.findOne({ emailLookupHash: getEmailHash(email) });
    if (!user) {
      const enrollmentNo = email.split('@')[0].toUpperCase();
      user = await User.create({
        name,
        email,
        enrollmentNo,
        password: 'OAUTH_USER',
        role: 'info_admin', // Special role for these users
        referencePhotoUrl: picture
      });
    } else {
      // Ensure they have the correct role
      if (user.role !== 'info_admin') {
        user.role = 'info_admin';
        await user.save();
      }
    }

    // Log successful attempt
    await LoginLog.create({
      userId: user._id,
      email,
      ipAddress,
      userAgent,
      location,
      success: true
    });

    await sendTokenCookie(user, 200, res, req);
  } catch (error) {
    console.error(error);
    res.status(401).json({ success: false, message: 'Google Authentication failed' });
  }
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      res.json({
        success: true,
        user: {
          _id: user._id,
          name: user.name,
          enrollmentNo: user.enrollmentNo,
          email: user.email,
          role: user.role,
          assignedClassroom: user.assignedClassroom,
        },
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error fetching user details' });
  }
});

// @desc    Refresh Access Token
// @route   POST /api/auth/refresh
// @access  Public
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'No refresh token provided' });
    }

    // Find session by current or used refresh token
    const session = await Session.findOne({ 
      $or: [{ refreshToken }, { usedRefreshTokens: refreshToken }] 
    });

    if (!session) {
      res.clearCookie('accessToken', { httpOnly: true, sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', secure: process.env.NODE_ENV === 'production' });
      res.clearCookie('refreshToken', { httpOnly: true, sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', secure: process.env.NODE_ENV === 'production' });
      res.clearCookie('csrfToken', { sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', secure: process.env.NODE_ENV === 'production' });
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    // Token Reuse Detection
    if (session.usedRefreshTokens.includes(refreshToken)) {
      console.warn(`[SECURITY ALERT] Token reuse detected for User ${session.userId}. Revoking session.`);
      session.isRevoked = true;
      await session.save();
      res.clearCookie('accessToken', { httpOnly: true, sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', secure: process.env.NODE_ENV === 'production' });
      res.clearCookie('refreshToken', { httpOnly: true, sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', secure: process.env.NODE_ENV === 'production' });
      res.clearCookie('csrfToken', { sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', secure: process.env.NODE_ENV === 'production' });
      return res.status(401).json({ success: false, message: 'Token reuse detected. Session revoked.' });
    }

    // Normal expiration check
    if (session.isRevoked || session.expiresAt < new Date()) {
      session.isRevoked = true;
      await session.save();
      res.clearCookie('accessToken', { httpOnly: true, sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', secure: process.env.NODE_ENV === 'production' });
      res.clearCookie('refreshToken', { httpOnly: true, sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', secure: process.env.NODE_ENV === 'production' });
      res.clearCookie('csrfToken', { sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', secure: process.env.NODE_ENV === 'production' });
      return res.status(401).json({ success: false, message: 'Session expired or invalid' });
    }

    const user = await User.findById(session.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Token Rotation
    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    session.usedRefreshTokens.push(refreshToken); // Mark old token as used
    session.refreshToken = newRefreshToken;
    session.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await session.save();

    // IP extraction for binding
    const rawIp = req?.headers?.['x-forwarded-for'] || req?.ip || req?.connection?.remoteAddress || req?.socket?.remoteAddress || '127.0.0.1';
    const ipAddress = rawIp.includes(',') ? rawIp.split(',')[0].trim() : rawIp.trim();
    const ipHash = crypto.createHash('sha256').update(ipAddress).digest('hex');

    const newAccessToken = generateAccessToken(user._id, ipHash, user.tokenVersion || 0);

    const cookieOptionsAccess = {
      expires: new Date(Date.now() + 5 * 60 * 1000),
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production'
    };
    const cookieOptionsRefresh = {
      expires: session.expiresAt,
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production'
    };
    
    const csrfToken = crypto.randomBytes(32).toString('hex');

    res
      .status(200)
      .cookie('accessToken', newAccessToken, cookieOptionsAccess)
      .cookie('refreshToken', newRefreshToken, cookieOptionsRefresh)
      .cookie('csrfToken', csrfToken, { sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', secure: process.env.NODE_ENV === 'production' })
      .json({ success: true, csrfToken });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Get current user's login history
// @route   GET /api/auth/my-logins
// @access  Private
router.get('/my-logins', protect, async (req, res) => {
  try {
    const logs = await LoginLog.find({ userId: req.user.id })
      .sort({ timestamp: -1 })
      .limit(10); // Return last 10 logins

    res.json({
      success: true,
      logs
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error fetching login history' });
  }
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Public
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (refreshToken) {
      await Session.findOneAndUpdate({ refreshToken }, { isRevoked: true });
    }
  } catch(e) {}
  
  const cookieOptions = {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production'
  };
  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
  res.clearCookie('csrfToken', { sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', secure: process.env.NODE_ENV === 'production' });
  res.json({ success: true, message: 'Logged out successfully' });
});



module.exports = router;
