/**
 * Token Utility Module
 * Handles JWT generation, verification, and management
 * 
 * @module utils/token.util
 * @requires jsonwebtoken
 * @requires crypto
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../config/logger');

// ============================================
// Configuration
// ============================================

const JWT_CONFIG = {
    secret: process.env.JWT_SECRET || 'default-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    algorithm: 'HS256',
    issuer: 'pure-survey-platform',
    audience: 'pure-survey-users'
};

// Blacklisted tokens (for logout)
// In production, use Redis for scalability
const tokenBlacklist = new Map();

// Refresh tokens storage (in production, use database)
const refreshTokens = new Map();

// ============================================
// JWT Token Functions
// ============================================

/**
 * Generate JWT access token for authenticated user
 * @param {Object} user - User object
 * @param {Object} options - Additional options
 * @returns {string} JWT token
 */
const generateToken = (user, options = {}) => {
    try {
        const payload = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            ...options
        };

        const token = jwt.sign(
            payload,
            JWT_CONFIG.secret,
            {
                expiresIn: options.expiresIn || JWT_CONFIG.expiresIn,
                algorithm: JWT_CONFIG.algorithm,
                issuer: JWT_CONFIG.issuer,
                audience: JWT_CONFIG.audience
            }
        );

        logger.debug(`Token generated for user: ${user.email}`);
        return token;

    } catch (error) {
        logger.error('Token generation failed:', error);
        throw new Error('Failed to generate authentication token');
    }
};

/**
 * Generate refresh token (long-lived)
 * @param {Object} user - User object
 * @returns {string} Refresh token
 */
const generateRefreshToken = (user) => {
    const refreshToken = crypto.randomBytes(64).toString('hex');
    
    // Store refresh token with expiry (7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    refreshTokens.set(refreshToken, {
        userId: user.id,
        email: user.email,
        expiresAt: expiresAt,
        createdAt: new Date()
    });

    // Auto-cleanup expired refresh tokens after 7 days
    setTimeout(() => {
        if (refreshTokens.has(refreshToken)) {
            refreshTokens.delete(refreshToken);
            logger.debug(`Cleaned up expired refresh token for ${user.email}`);
        }
    }, 7 * 24 * 60 * 60 * 1000);

    return refreshToken;
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or blacklisted
 */
const verifyToken = (token) => {
    try {
        // Check if token is blacklisted
        if (isTokenBlacklisted(token)) {
            throw new Error('Token has been invalidated');
        }

        const decoded = jwt.verify(token, JWT_CONFIG.secret, {
            algorithms: [JWT_CONFIG.algorithm],
            issuer: JWT_CONFIG.issuer,
            audience: JWT_CONFIG.audience
        });

        return decoded;

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token has expired');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid token');
        }
        throw error;
    }
};

/**
 * Decode JWT token without verification
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null
 */
const decodeToken = (token) => {
    try {
        return jwt.decode(token);
    } catch (error) {
        logger.error('Token decode failed:', error);
        return null;
    }
};

/**
 * Get token expiry time
 * @param {string} token - JWT token
 * @returns {Date|null} Expiry date or null
 */
const getTokenExpiry = (token) => {
    const decoded = decodeToken(token);
    if (decoded && decoded.exp) {
        return new Date(decoded.exp * 1000);
    }
    return null;
};

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} True if expired
 */
const isTokenExpired = (token) => {
    const expiry = getTokenExpiry(token);
    if (!expiry) return true;
    return expiry < new Date();
};

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Refresh token
 * @returns {Object} New access token and refresh token
 */
const refreshAccessToken = (refreshToken) => {
    try {
        const storedToken = refreshTokens.get(refreshToken);
        
        if (!storedToken) {
            throw new Error('Invalid refresh token');
        }

        if (new Date() > storedToken.expiresAt) {
            refreshTokens.delete(refreshToken);
            throw new Error('Refresh token has expired');
        }

        // Generate new access token
        const user = {
            id: storedToken.userId,
            email: storedToken.email
        };

        const newAccessToken = generateToken(user, { expiresIn: '24h' });
        
        // Optionally generate new refresh token (refresh token rotation)
        const newRefreshToken = generateRefreshToken(user);

        // Invalidate old refresh token (rotation)
        refreshTokens.delete(refreshToken);

        return {
            success: true,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        };

    } catch (error) {
        logger.error('Token refresh failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// ============================================
// Token Blacklist Functions (Logout)
// ============================================

/**
 * Add token to blacklist (for logout)
 * @param {string} token - JWT token to blacklist
 * @returns {boolean} Success status
 */
const blacklistToken = (token) => {
    try {
        const decoded = decodeToken(token);
        if (!decoded || !decoded.exp) {
            return false;
        }

        const expiryDate = new Date(decoded.exp * 1000);
        const ttl = expiryDate - new Date();

        if (ttl > 0) {
            tokenBlacklist.set(token, {
                blacklistedAt: new Date(),
                expiresAt: expiryDate
            });

            // Auto-remove from blacklist after expiry
            setTimeout(() => {
                if (tokenBlacklist.has(token)) {
                    tokenBlacklist.delete(token);
                    logger.debug('Token removed from blacklist after expiry');
                }
            }, ttl);

            logger.debug(`Token blacklisted until ${expiryDate}`);
            return true;
        }

        return false;

    } catch (error) {
        logger.error('Token blacklist failed:', error);
        return false;
    }
};

/**
 * Check if token is blacklisted
 * @param {string} token - JWT token to check
 * @returns {boolean} True if blacklisted
 */
const isTokenBlacklisted = (token) => {
    return tokenBlacklist.has(token);
};

/**
 * Clear expired tokens from blacklist
 */
const clearExpiredBlacklistedTokens = () => {
    const now = new Date();
    for (const [token, data] of tokenBlacklist.entries()) {
        if (now > data.expiresAt) {
            tokenBlacklist.delete(token);
        }
    }
};

// Run cleanup every hour
setInterval(clearExpiredBlacklistedTokens, 60 * 60 * 1000);

// ============================================
// CSRF Token Functions
// ============================================

/**
 * Generate CSRF token for form protection
 * @param {string} sessionId - User session ID
 * @returns {string} CSRF token
 */
const generateCSRFToken = (sessionId) => {
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString('hex');
    const payload = `${sessionId}:${timestamp}:${random}`;
    
    // Create HMAC signature
    const signature = crypto
        .createHmac('sha256', JWT_CONFIG.secret)
        .update(payload)
        .digest('hex');
    
    return `${payload}:${signature}`;
};

/**
 * Verify CSRF token
 * @param {string} token - CSRF token to verify
 * @param {string} sessionId - User session ID
 * @returns {boolean} True if valid
 */
const verifyCSRFToken = (token, sessionId) => {
    try {
        const parts = token.split(':');
        if (parts.length !== 4) return false;
        
        const [tokenSessionId, timestamp, random, signature] = parts;
        
        // Check session match
        if (tokenSessionId !== sessionId) return false;
        
        // Check token age (max 1 hour)
        const tokenTime = parseInt(timestamp);
        if (isNaN(tokenTime)) return false;
        
        const age = Date.now() - tokenTime;
        if (age > 60 * 60 * 1000) return false; // 1 hour
        
        // Verify signature
        const payload = `${tokenSessionId}:${timestamp}:${random}`;
        const expectedSignature = crypto
            .createHmac('sha256', JWT_CONFIG.secret)
            .update(payload)
            .digest('hex');
        
        return signature === expectedSignature;
        
    } catch (error) {
        logger.error('CSRF verification failed:', error);
        return false;
    }
};

// ============================================
// Password Reset Token Functions
// ============================================

/**
 * Generate password reset token
 * @param {string} userId - User ID
 * @returns {string} Reset token
 */
const generatePasswordResetToken = (userId) => {
    const random = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now();
    const payload = `${userId}:${timestamp}:${random}`;
    
    const signature = crypto
        .createHmac('sha256', JWT_CONFIG.secret)
        .update(payload)
        .digest('hex');
    
    return `${payload}:${signature}`;
};

/**
 * Verify password reset token and extract user ID
 * @param {string} token - Reset token
 * @returns {Object} Result with userId or error
 */
const verifyPasswordResetToken = (token) => {
    try {
        const parts = token.split(':');
        if (parts.length !== 4) {
            return { success: false, error: 'Invalid token format' };
        }
        
        const [userId, timestamp, random, signature] = parts;
        
        // Check token age (max 1 hour)
        const tokenTime = parseInt(timestamp);
        if (isNaN(tokenTime)) {
            return { success: false, error: 'Invalid token' };
        }
        
        const age = Date.now() - tokenTime;
        if (age > 60 * 60 * 1000) {
            return { success: false, error: 'Token has expired' };
        }
        
        // Verify signature
        const payload = `${userId}:${timestamp}:${random}`;
        const expectedSignature = crypto
            .createHmac('sha256', JWT_CONFIG.secret)
            .update(payload)
            .digest('hex');
        
        if (signature !== expectedSignature) {
            return { success: false, error: 'Invalid token signature' };
        }
        
        return { success: true, userId: parseInt(userId) };
        
    } catch (error) {
        logger.error('Password reset token verification failed:', error);
        return { success: false, error: 'Verification failed' };
    }
};

// ============================================
// Utility Functions
// ============================================

/**
 * Generate random ID for sessions
 * @param {number} length - ID length (default: 32)
 * @returns {string} Random ID
 */
const generateRandomId = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Extracted token or null
 */
const extractTokenFromHeader = (authHeader) => {
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }
    
    return parts[1];
};

/**
 * Get token payload without verification
 * @param {string} token - JWT token
 * @returns {Object|null} Token payload
 */
const getTokenPayload = (token) => {
    return decodeToken(token);
};

// ============================================
// Module Exports
// ============================================

module.exports = {
    // JWT Token
    generateToken,
    generateRefreshToken,
    verifyToken,
    decodeToken,
    getTokenExpiry,
    isTokenExpired,
    refreshAccessToken,
    
    // Blacklist (Logout)
    blacklistToken,
    isTokenBlacklisted,
    clearExpiredBlacklistedTokens,
    
    // CSRF Protection
    generateCSRFToken,
    verifyCSRFToken,
    
    // Password Reset
    generatePasswordResetToken,
    verifyPasswordResetToken,
    
    // Utilities
    generateRandomId,
    extractTokenFromHeader,
    getTokenPayload
};