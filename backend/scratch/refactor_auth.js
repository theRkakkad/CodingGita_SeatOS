const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../routes/auth.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Add imports
code = code.replace(
  "const User = require('../models/User');",
  "const User = require('../models/User');\nconst Session = require('../models/Session');\nconst crypto = require('crypto');"
);

// 2. Replace generateToken and sendTokenCookie
const oldTokenLogic = `// Generate JWT Helper
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
};`;

const newTokenLogic = `// Generate JWT Helper
const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '5m', // Short-lived Access Token
  });
};

const sendTokenCookie = async (user, statusCode, res, req) => {
  const accessToken = generateAccessToken(user._id);
  const refreshToken = crypto.randomBytes(40).toString('hex');
  
  // IP & Geolocation info extraction
  const rawIp = req?.headers['x-forwarded-for'] || req?.ip || req?.connection?.remoteAddress || req?.socket?.remoteAddress || '127.0.0.1';
  const ipAddress = rawIp.includes(',') ? rawIp.split(',')[0].trim() : rawIp.trim();
  const userAgent = req?.headers['user-agent'] || '';
  const geo = geoip.lookup(ipAddress);
  const location = {
    country: geo?.country || 'Localhost',
    region: geo?.region || 'Localhost',
    city: geo?.city || 'Localhost'
  };

  // Create Session
  await Session.create({
    userId: user._id,
    refreshToken,
    deviceInfo: { browser: userAgent },
    ipAddress,
    location,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  });

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
  }

  // Generate CSRF Token for Double Submit Cookie pattern
  const csrfToken = crypto.randomBytes(32).toString('hex');

  res
    .status(statusCode)
    .cookie('accessToken', accessToken, cookieOptionsAccess)
    .cookie('refreshToken', refreshToken, cookieOptionsRefresh)
    .cookie('csrfToken', csrfToken, { sameSite: 'lax', secure: process.env.NODE_ENV === 'production' })
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
};`;

code = code.replace(oldTokenLogic, newTokenLogic);

// 3. Replace sendTokenCookie calls
code = code.replace(/sendTokenCookie\(user, (\d+), res\);/g, 'await sendTokenCookie(user, $1, res, req);');

// 4. Add /refresh and /logout (replacing the old logout)
const oldLogoutLogic = `// @desc    Logout user / clear cookie
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
});`;

const refreshAndLogoutLogic = `// @desc    Refresh Access Token
// @route   POST /api/auth/refresh
// @access  Public
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'No refresh token provided' });
    }

    const session = await Session.findOne({ refreshToken, isRevoked: false });
    if (!session || session.expiresAt < new Date()) {
      if (session) {
        session.isRevoked = true;
        await session.save();
      }
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      res.clearCookie('csrfToken');
      return res.status(401).json({ success: false, message: 'Session expired or invalid' });
    }

    const user = await User.findById(session.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Token Rotation
    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    session.refreshToken = newRefreshToken;
    session.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await session.save();

    const newAccessToken = generateAccessToken(user._id);

    const cookieOptionsAccess = {
      expires: new Date(Date.now() + 5 * 60 * 1000),
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    };
    const cookieOptionsRefresh = {
      expires: session.expiresAt,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    };
    
    const csrfToken = crypto.randomBytes(32).toString('hex');

    res
      .status(200)
      .cookie('accessToken', newAccessToken, cookieOptionsAccess)
      .cookie('refreshToken', newRefreshToken, cookieOptionsRefresh)
      .cookie('csrfToken', csrfToken, { sameSite: 'lax', secure: process.env.NODE_ENV === 'production' })
      .json({ success: true, csrfToken });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error during refresh' });
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
  
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.clearCookie('csrfToken');
  res.json({ success: true, message: 'Logged out successfully' });
});`;

code = code.replace(oldLogoutLogic, refreshAndLogoutLogic);

fs.writeFileSync(filePath, code);
console.log('auth.js refactored successfully');
