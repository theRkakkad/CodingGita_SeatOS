const BannedIP = require('../models/BannedIP');

const checkBannedIp = async (req, res, next) => {
  const rawIp = req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1';
  const ipAddress = rawIp.includes(',') ? rawIp.split(',')[0].trim() : rawIp.trim();

  try {
    const isBanned = await BannedIP.findOne({ ipAddress });
    if (isBanned) {
      const hoursBanned = (Date.now() - new Date(isBanned.bannedAt).getTime()) / (1000 * 60 * 60);
      if (hoursBanned > 1) {
        // Cooldown period expired, remove ban
        await BannedIP.deleteOne({ _id: isBanned._id });
        console.log(`[SECURITY] Removed expired IP ban for ${ipAddress}`);
        return next();
      }

      console.warn(`[SECURITY ALERT] Blocked request from temporarily banned IP: ${ipAddress}`);
      return res.status(403).json({ 
        error: 'Access Denied.', 
        message: 'Your IP address has been temporarily blacklisted due to malicious activity.' 
      });
    }
    next();
  } catch (error) {
    console.error('Banned IP check failed:', error);
    next();
  }
};

module.exports = checkBannedIp;
