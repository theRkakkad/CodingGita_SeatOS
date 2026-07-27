const jwt = require('jsonwebtoken');
const User = require('../models/User');
const crypto = require('crypto');

// Protect routes
const protect = async (req, res, next) => {
  const rawIp = req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1';
  const clientIp = rawIp.includes(',') ? rawIp.split(',')[0].trim() : rawIp.trim();
  let token;

  // CSRF Protection for state-changing requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const csrfCookie = req.cookies?.csrfToken;
    const csrfHeader = req.headers['x-csrf-token'];
    
    // We allow bypass only if Authorization header is used (e.g. external API script)
    if (!req.headers.authorization?.startsWith('Bearer')) {
      if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        console.warn(`[CSRF WARN] CSRF mismatch/missing | IP: ${clientIp} | Path: ${req.originalUrl}`);
        return res.status(403).json({ success: false, message: 'CSRF validation failed' });
      }
    }
  }

  // 1. Extract from cookies
  if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
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

    // IP Binding Check (Downgraded to Logging)
    const ipHash = crypto.createHash('sha256').update(clientIp).digest('hex');
    if (decoded.ipHash && decoded.ipHash !== ipHash) {
      console.warn(`[SECURITY LOG] IP change detected for user ${decoded.id} | Expected Hash: ${decoded.ipHash} | New Hash: ${ipHash}`);
      // Do NOT reject the request. Mobile/WiFi switches are normal.
    }

    // Get user from the token, exclude password
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      console.warn(`[AUTH WARN] User not found for token | IP: ${clientIp} | Path: ${req.originalUrl} | UA: ${req.headers['user-agent']}`);
      return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
    }

    // Token Version (Kill Switch) Check
    if (decoded.tokenVersion !== undefined && req.user.tokenVersion !== decoded.tokenVersion) {
      console.warn(`[SECURITY ALERT] Token Version Mismatch! Session revoked | Expected: ${req.user.tokenVersion} | Got: ${decoded.tokenVersion}`);
      return res.status(401).json({ success: false, message: 'Session revoked. Please login again.' });
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
