const BannedIP = require('../models/BannedIP');

const checkBannedIp = async (req, res, next) => {
  const rawIp = req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1';
  const ipAddress = rawIp.includes(',') ? rawIp.split(',')[0].trim() : rawIp.trim();

  try {
    const isBanned = await BannedIP.findOne({ ipAddress });
    if (isBanned) {
      console.warn(`[SECURITY ALERT] Blocked request from permanently banned IP: ${ipAddress}`);
      // Drop connection immediately or return 403
      return res.status(403).json({ 
        error: 'Access Denied.', 
        message: 'Your IP address has been permanently blacklisted due to malicious activity.' 
      });
    }
    next();
  } catch (error) {
    console.error('Banned IP check failed:', error);
    next();
  }
};

module.exports = checkBannedIp;
