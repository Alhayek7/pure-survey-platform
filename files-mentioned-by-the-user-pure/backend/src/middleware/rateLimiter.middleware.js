const rateLimit = require('express-rate-limit');
const generalLimiter = rateLimit({ windowMs: 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false });
const loginLimiter = rateLimit({ windowMs: 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many login attempts, try again later' } });
module.exports = { generalLimiter, loginLimiter };
