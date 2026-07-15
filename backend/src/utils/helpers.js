const jwt = require('jsonwebtoken');
const winston = require('winston');
const logger = winston.createLogger({ level: 'info', format: winston.format.combine(winston.format.timestamp(), winston.format.json()), transports: [new winston.transports.Console()] });
function signToken(user) { return jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }); }
function publicUser(user) { if (!user) return null; const raw = user.toJSON ? user.toJSON() : { ...user }; delete raw.password_hash; return raw; }
function asyncHandler(fn) { return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next); }
module.exports = { logger, signToken, publicUser, asyncHandler };
