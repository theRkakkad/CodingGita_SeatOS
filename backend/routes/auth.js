const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const geoip = require('geoip-lite');
const User = require('../models/User');
const LoginLog = require('../models/LoginLog');
const { protect, authorize } = require('../middleware/auth');
const sendEmail = require('../utils/sendEmail');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT Helper
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const sendTokenCookie = (user, statusCode, res) => {
  const token = generateToken(user._id);

  const cookieOptions = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    sameSite: 'strict',
  };

  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      token,
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
    const { name, enrollmentNo, email, password } = req.body;

    if (!name || !enrollmentNo || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all fields' });
    }

    // Check if email ends with @gmail.com
    if (!email.toLowerCase().endsWith('@gmail.com')) {
      return res.status(400).json({ success: false, message: 'Only Gmail addresses (@gmail.com) are allowed to register' });
    }

    // Check if user already exists by email or enrollment number
    const userExistsByEmail = await User.findOne({ email });
    if (userExistsByEmail) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const userExistsByEnrollment = await User.findOne({ enrollmentNo });
    if (userExistsByEnrollment) {
      return res.status(400).json({ success: false, message: 'Enrollment number already registered' });
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

      sendTokenCookie(user, 201, res);
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
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
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

    // Check for user
    const user = await User.findOne({ email }).select('+password');
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

    sendTokenCookie(user, 200, res);
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
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Please provide Google idToken' });
    }

    // Verify Google Token strictly (NO MOCKS)
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    const { email, name, picture } = payload;

    // Check university domain strictly
    if (!email.toLowerCase().endsWith('@swaminarayanuniversity.ac.in')) {
      return res.status(403).json({ success: false, message: 'Only @swaminarayanuniversity.ac.in addresses are allowed' });
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
    let user = await User.findOne({ email });
    if (!user) {
      // Create student user if not exists
      const enrollmentNo = email.split('@')[0].toUpperCase();
      user = await User.create({
        name,
        email,
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

    sendTokenCookie(user, 200, res);
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
    let user = await User.findOne({ email });
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

    sendTokenCookie(user, 200, res);
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

// @desc    Logout user / clear cookie
// @route   GET /api/auth/logout
// @access  Private
router.get('/logout', protect, async (req, res) => {
  try {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error during logout' });
  }
});

// @desc    Developer Bypass Login (For local development only)
// @route   POST /api/auth/dev-login
// @access  Public
router.post('/dev-login', async (req, res) => {
  try {
    const { email, role } = req.body;
    let user = await User.findOne({ email });
    
    if (!user) {
      // Create user if not exists
      const enrollmentNo = email.split('@')[0].toUpperCase();
      user = await User.create({
        name: 'Dev User',
        email,
        enrollmentNo,
        password: 'OAUTH_USER',
        role: role || 'student',
      });
    } else if (role && user.role !== role) {
      user.role = role;
      await user.save();
    }

    sendTokenCookie(user, 200, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Dev login failed' });
  }
});

module.exports = router;
