/**
 * Google reCAPTCHA Middleware
 * Protects forms and APIs from bots and automated attacks
 * 
 * @module middleware/recaptcha
 * @requires axios
 * @requires ../config/logger
 */

const axios = require('axios');
const logger = require('../config/logger');

// ============================================
// Configuration
// ============================================

const RECAPTCHA_CONFIG = {
    secretKey: process.env.RECAPTCHA_SECRET_KEY,
    siteKey: process.env.RECAPTCHA_SITE_KEY,
    verifyUrl: 'https://www.google.com/recaptcha/api/siteverify',
    threshold: parseFloat(process.env.RECAPTCHA_THRESHOLD) || 0.5,
    timeout: 5000, // 5 seconds timeout
    enabled: process.env.ENABLE_RECAPTCHA === 'true'
};

// Rate limiting for reCAPTCHA verification failures
const verificationAttempts = new Map();

// ============================================
// Core Verification Functions
// ============================================

/**
 * Verify reCAPTCHA token with Google
 * @param {string} token - reCAPTCHA response token from client
 * @param {string} clientIp - Client IP address
 * @returns {Promise<Object>} Verification result
 */
const verifyRecaptchaToken = async (token, clientIp = null) => {
    if (!RECAPTCHA_CONFIG.enabled) {
        logger.debug('reCAPTCHA is disabled, skipping verification');
        return { success: true, skipped: true };
    }

    if (!token) {
        logger.warn('reCAPTCHA token missing');
        return { 
            success: false, 
            error: 'reCAPTCHA token is required',
            code: 'MISSING_TOKEN'
        };
    }

    try {
        const params = new URLSearchParams();
        params.append('secret', RECAPTCHA_CONFIG.secretKey);
        params.append('response', token);
        if (clientIp) {
            params.append('remoteip', clientIp);
        }

        const response = await axios.post(RECAPTCHA_CONFIG.verifyUrl, params, {
            timeout: RECAPTCHA_CONFIG.timeout,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { success, score, action, challenge_ts, hostname, error_codes } = response.data;

        logger.info(`reCAPTCHA verification result: success=${success}, score=${score}, action=${action}`);

        if (!success) {
            const errorMessage = error_codes ? error_codes.join(', ') : 'Unknown error';
            logger.warn(`reCAPTCHA verification failed: ${errorMessage}`);
            
            // Track failed verification attempts
            trackFailedAttempt(clientIp);
            
            return {
                success: false,
                error: 'reCAPTCHA verification failed',
                details: error_codes,
                code: 'VERIFICATION_FAILED'
            };
        }

        // Check score threshold (v3 only)
        if (score !== undefined && score < RECAPTCHA_CONFIG.threshold) {
            logger.warn(`reCAPTCHA score too low: ${score} < ${RECAPTCHA_CONFIG.threshold}`);
            trackFailedAttempt(clientIp);
            
            return {
                success: false,
                error: 'Security check failed. Please try again.',
                score: score,
                threshold: RECAPTCHA_CONFIG.threshold,
                code: 'LOW_SCORE'
            };
        }

        // Success - reset failed attempts
        resetFailedAttempts(clientIp);

        return {
            success: true,
            score: score,
            action: action,
            timestamp: challenge_ts,
            hostname: hostname
        };

    } catch (error) {
        logger.error('reCAPTCHA verification request failed:', error.message);
        
        // In case of network error, we can either block or allow
        // For security, it's better to block when verification fails
        return {
            success: false,
            error: 'reCAPTCHA service unavailable',
            code: 'SERVICE_UNAVAILABLE'
        };
    }
};

/**
 * Track failed verification attempts for rate limiting
 * @param {string} clientIp - Client IP address
 */
const trackFailedAttempt = (clientIp) => {
    if (!clientIp) return;
    
    const now = Date.now();
    const attempts = verificationAttempts.get(clientIp) || [];
    const recentAttempts = attempts.filter(timestamp => now - timestamp < 15 * 60 * 1000);
    recentAttempts.push(now);
    verificationAttempts.set(clientIp, recentAttempts);
};

/**
 * Reset failed attempts for a client
 * @param {string} clientIp - Client IP address
 */
const resetFailedAttempts = (clientIp) => {
    if (clientIp && verificationAttempts.has(clientIp)) {
        verificationAttempts.delete(clientIp);
    }
};

/**
 * Check if client has too many failed verifications
 * @param {string} clientIp - Client IP address
 * @returns {boolean} True if rate limited
 */
const isRateLimited = (clientIp) => {
    if (!clientIp) return false;
    
    const attempts = verificationAttempts.get(clientIp) || [];
    const recentAttempts = attempts.filter(timestamp => Date.now() - timestamp < 15 * 60 * 1000);
    
    return recentAttempts.length >= 10; // Max 10 failed attempts per 15 minutes
};

// ============================================
// reCAPTCHA Middleware
// ============================================

/**
 * Middleware to verify reCAPTCHA for protected routes
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware
 */
const recaptchaMiddleware = (options = {}) => {
    const {
        required = true,
        scoreThreshold = RECAPTCHA_CONFIG.threshold,
        actions = [], // Specific actions allowed
        skipOnError = false // Skip verification on network error
    } = options;

    return async (req, res, next) => {
        // Skip if reCAPTCHA is disabled
        if (!RECAPTCHA_CONFIG.enabled) {
            return next();
        }

        // Get token from request body or headers
        const token = req.body['g-recaptcha-response'] || 
                     req.headers['x-recaptcha-token'] ||
                     req.query.recaptcha;

        const clientIp = req.ip || req.connection.remoteAddress;

        // Check rate limiting for failed attempts
        if (isRateLimited(clientIp)) {
            return res.status(429).json({
                success: false,
                message: 'Too many verification attempts. Please try again later.',
                code: 'RATE_LIMITED'
            });
        }

        // If token is missing and verification is required
        if (!token && required) {
            return res.status(400).json({
                success: false,
                message: 'reCAPTCHA verification required',
                code: 'MISSING_TOKEN'
            });
        }

        // If token is missing but not required, proceed
        if (!token && !required) {
            return next();
        }

        // Verify token
        const verification = await verifyRecaptchaToken(token, clientIp);

        if (!verification.success) {
            if (skipOnError && verification.code === 'SERVICE_UNAVAILABLE') {
                logger.warn('reCAPTCHA service unavailable, skipping verification');
                return next();
            }

            return res.status(400).json({
                success: false,
                message: verification.error || 'reCAPTCHA verification failed',
                code: verification.code,
                score: verification.score
            });
        }

        // Check if action matches allowed actions
        if (actions.length > 0 && verification.action) {
            if (!actions.includes(verification.action)) {
                logger.warn(`reCAPTCHA action mismatch: ${verification.action} not in ${actions}`);
                return res.status(400).json({
                    success: false,
                    message: 'Invalid reCAPTCHA action',
                    code: 'INVALID_ACTION'
                });
            }
        }

        // Check score threshold
        if (verification.score !== undefined && verification.score < scoreThreshold) {
            return res.status(400).json({
                success: false,
                message: 'Security verification failed. Please try again.',
                score: verification.score,
                threshold: scoreThreshold,
                code: 'LOW_SCORE'
            });
        }

        // Attach verification data to request
        req.recaptcha = {
            verified: true,
            score: verification.score,
            action: verification.action,
            timestamp: verification.timestamp
        };

        next();
    };
};

// ============================================
// Specialized Middleware for Different Routes
// ============================================

/**
 * Strict reCAPTCHA for login/register (higher threshold)
 */
const authRecaptchaMiddleware = recaptchaMiddleware({
    required: true,
    scoreThreshold: 0.7,
    actions: ['login', 'register']
});

/**
 * Moderate reCAPTCHA for survey submission (medium threshold)
 */
const surveyRecaptchaMiddleware = recaptchaMiddleware({
    required: true,
    scoreThreshold: 0.5,
    actions: ['survey_submit']
});

/**
 * Lax reCAPTCHA for general forms (lower threshold)
 */
const laxRecaptchaMiddleware = recaptchaMiddleware({
    required: true,
    scoreThreshold: 0.3
});

/**
 * Optional reCAPTCHA (not required but checked if present)
 */
const optionalRecaptchaMiddleware = recaptchaMiddleware({
    required: false,
    scoreThreshold: 0.3
});

/**
 * Disabled reCAPTCHA for internal/admin routes
 */
const disabledRecaptchaMiddleware = (req, res, next) => {
    // Skip reCAPTCHA for admin routes
    next();
};

// ============================================
// Helper Functions for Frontend
// ============================================

/**
 * Get reCAPTCHA site key for frontend
 * @returns {string|null} Site key
 */
const getSiteKey = () => {
    return RECAPTCHA_CONFIG.enabled ? RECAPTCHA_CONFIG.siteKey : null;
};

/**
 * Check if reCAPTCHA is enabled
 * @returns {boolean}
 */
const isEnabled = () => {
    return RECAPTCHA_CONFIG.enabled;
};

/**
 * Get reCAPTCHA configuration for frontend
 * @returns {Object} Configuration object
 */
const getConfig = () => {
    return {
        enabled: RECAPTCHA_CONFIG.enabled,
        siteKey: RECAPTCHA_CONFIG.siteKey,
        threshold: RECAPTCHA_CONFIG.threshold
    };
};

// ============================================
// Cleanup interval for verification attempts
// ============================================

setInterval(() => {
    const now = Date.now();
    for (const [ip, attempts] of verificationAttempts.entries()) {
        const recentAttempts = attempts.filter(timestamp => now - timestamp < 15 * 60 * 1000);
        if (recentAttempts.length === 0) {
            verificationAttempts.delete(ip);
        } else {
            verificationAttempts.set(ip, recentAttempts);
        }
    }
}, 5 * 60 * 1000); // Cleanup every 5 minutes

// ============================================
// Module Exports
// ============================================

module.exports = {
    // Main middleware
    recaptchaMiddleware,
    
    // Specialized middleware
    authRecaptchaMiddleware,
    surveyRecaptchaMiddleware,
    laxRecaptchaMiddleware,
    optionalRecaptchaMiddleware,
    disabledRecaptchaMiddleware,
    
    // Utilities
    verifyRecaptchaToken,
    getSiteKey,
    isEnabled,
    getConfig,
    
    // Constants
    RECAPTCHA_CONFIG
};