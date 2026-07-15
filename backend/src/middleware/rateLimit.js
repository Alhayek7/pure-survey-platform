const logger = require('../config/logger');

// ============================================
// Dummy Rate Limiters (Disabled for Development)
// ============================================

// Middleware that passes through all requests
const passThrough = (req, res, next) => next();

// Create dummy limiters that bypass all rate limiting
const generalLimiter = passThrough;
const authLimiter = passThrough;
const strictLimiter = passThrough;
const surveyLimiter = passThrough;
const responseLimiter = passThrough;
const uploadLimiter = passThrough;
const slowDownLimiter = passThrough;

// Dummy IP blocking functions
const blockIP = (ip, duration) => {
    logger.debug(`IP blocking disabled in development: ${ip}`);
};

const isIPBlocked = (ip) => false;

const ipBlockingMiddleware = (req, res, next) => next();

const getRateLimitStatus = async (req) => ({
    currentRequests: 0,
    remainingRequests: 100,
    limit: 100,
    resetTime: new Date()
});

// Dummy store
const store = {
    get: async () => 0,
    increment: async () => {},
    decrement: async () => {},
    resetKey: async () => {},
    close: () => {}
};

module.exports = {
    generalLimiter,
    authLimiter,
    strictLimiter,
    surveyLimiter,
    responseLimiter,
    uploadLimiter,
    slowDownLimiter,
    ipBlockingMiddleware,
    blockIP,
    isIPBlocked,
    getRateLimitStatus,
    store
};