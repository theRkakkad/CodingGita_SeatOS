const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes
const protect = async (req, res, next) => {
  const rawIp = req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1';
  const clientIp = rawIp.includes(',') ? rawIp.split(',')[0].trim() : rawIp.trim();
  let token;

  // 1. Extract from cookies
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Extract from Authorization header (fallback for compatibility)
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    console.warn(`[AUTH WARN] No token provided | IP: ${clientIp} | Path: ${req.originalUrl} | UA: ${req.headers['user-agent']}`);
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from the token, exclude password
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      console.warn(`[AUTH WARN] User not found for token | IP: ${clientIp} | Path: ${req.originalUrl} | UA: ${req.headers['user-agent']}`);
      return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
    }

    next();
  } catch (error) {
    console.error(`[AUTH ERROR] ${error.name}: ${error.message} | IP: ${clientIp} | Path: ${req.originalUrl} | UA: ${req.headers['user-agent']}`);
    res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
