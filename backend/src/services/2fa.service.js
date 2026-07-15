/**
 * Two-Factor Authentication Service
 * Handles generation, verification, and management of 2FA codes
 * 
 * @module services/2fa.service
 * @requires crypto
 * @requires speakeasy
 * @requires qrcode
 */

const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const logger = require('../config/logger');

// ============================================
// Configuration
// ============================================

const TWO_FA_CONFIG = {
    // TOTP (Time-based One-Time Password) configuration
    totp: {
        algorithm: 'sha512',
        digits: 6,
        period: 30,  // seconds
        encoding: 'base32'
    },
    
    // Backup codes configuration
    backupCodes: {
        count: 10,
        length: 8
    },
    
    // Email/SMS code configuration
    emailCode: {
        digits: 6,
        expirySeconds: 300, // 5 minutes
        maxAttempts: 5
    }
};

// ============================================
// TOTP (Authenticator App) Functions
// ============================================

/**
 * Generate TOTP secret for authenticator app (Google Authenticator, etc.)
 * @param {string} email - User's email
 * @param {string} issuer - App issuer name
 * @returns {Object} Secret data
 */
const generateTOTPSecret = (email, issuer = process.env.TWO_FA_ISSUER || 'PURE_Survey') => {
    try {
        const secret = speakeasy.generateSecret({
            name: `${issuer}:${email}`,
            length: 20,
            algorithm: TWO_FA_CONFIG.totp.algorithm
        });

        return {
            success: true,
            secret: secret.base32,
            otpauth_url: secret.otpauth_url,
            qr_code: null // Will be generated separately
        };
    } catch (error) {
        logger.error('TOTP secret generation failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Generate QR code for TOTP secret
 * @param {string} otpauthUrl - OTP Auth URL
 * @returns {Promise<string>} QR code as data URL
 */
const generateQRCode = async (otpauthUrl) => {
    try {
        const qrCodeDataURL = await QRCode.toDataURL(otpauthUrl);
        return qrCodeDataURL;
    } catch (error) {
        logger.error('QR code generation failed:', error);
        return null;
    }
};

/**
 * Verify TOTP code from authenticator app
 * @param {string} secret - User's TOTP secret
 * @param {string} token - 6-digit code from authenticator app
 * @returns {boolean} Verification result
 */
const verifyTOTPCode = (secret, token) => {
    try {
        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: TWO_FA_CONFIG.totp.encoding,
            token: token,
            window: 1, // Allow 1 period before/after (30 seconds tolerance)
            algorithm: TWO_FA_CONFIG.totp.algorithm
        });
        
        return verified;
    } catch (error) {
        logger.error('TOTP verification failed:', error);
        return false;
    }
};

// ============================================
// Email/SMS Code Functions (6-digit codes)
// ============================================

/**
 * Generate random 6-digit code for email/SMS 2FA
 * @returns {string} 6-digit code
 */
const generateEmailCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    return code;
};

/**
 * Generate cryptographically secure random code
 * @returns {string} 6-digit secure code
 */
const generateSecureCode = () => {
    const min = 100000;
    const max = 999999;
    const range = max - min + 1;
    
    // Use crypto for secure random numbers
    const randomBytes = crypto.randomBytes(4);
    const randomNumber = min + (randomBytes.readUInt32BE(0) % range);
    
    return randomNumber.toString().padStart(6, '0');
};

/**
 * Generate backup codes for recovery
 * @param {number} count - Number of backup codes
 * @returns {string[]} Array of backup codes
 */
const generateBackupCodes = (count = TWO_FA_CONFIG.backupCodes.count) => {
    const codes = [];
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    
    for (let i = 0; i < count; i++) {
        let code = '';
        for (let j = 0; j < TWO_FA_CONFIG.backupCodes.length; j++) {
            const randomIndex = crypto.randomInt(0, chars.length);
            code += chars[randomIndex];
            if (j === 3) code += '-';
        }
        codes.push(code.slice(0, -1)); // Remove trailing dash
    }
    
    return codes;
};

/**
 * Hash backup codes for secure storage
 * @param {string[]} codes - Array of backup codes
 * @returns {string[]} Array of hashed codes
 */
const hashBackupCodes = (codes) => {
    const hashedCodes = codes.map(code => {
        return crypto.createHash('sha256').update(code).digest('hex');
    });
    return hashedCodes;
};

/**
 * Verify a backup code
 * @param {string} inputCode - Code entered by user
 * @param {string[]} hashedCodes - Stored hashed backup codes
 * @returns {boolean} Verification result
 */
const verifyBackupCode = (inputCode, hashedCodes) => {
    const hashedInput = crypto.createHash('sha256').update(inputCode).digest('hex');
    return hashedCodes.includes(hashedInput);
};

/**
 * Remove used backup code
 * @param {string} inputCode - Used backup code
 * @param {string[]} hashedCodes - Stored hashed backup codes
 * @returns {string[]} Updated array of hashed codes
 */
const removeUsedBackupCode = (inputCode, hashedCodes) => {
    const hashedInput = crypto.createHash('sha256').update(inputCode).digest('hex');
    const index = hashedCodes.indexOf(hashedInput);
    
    if (index !== -1) {
        hashedCodes.splice(index, 1);
    }
    
    return hashedCodes;
};

// ============================================
// Code Expiry and Management
// ============================================

/**
 * Create a 2FA session with expiry
 * @param {Object} sessionData - Session data (userId, email, name)
 * @returns {Object} Session with code and expiry
 */
const create2FASession = (sessionData) => {
    const code = generateSecureCode();
    const expiresAt = new Date(Date.now() + TWO_FA_CONFIG.emailCode.expirySeconds * 1000);
    
    return {
        ...sessionData,
        code,
        codeExpiresAt: expiresAt,
        attempts: 0,
        maxAttempts: TWO_FA_CONFIG.emailCode.maxAttempts,
        createdAt: new Date()
    };
};

/**
 * Check if a 2FA session is expired
 * @param {Object} session - Session object
 * @returns {boolean} True if expired
 */
const isSessionExpired = (session) => {
    return new Date() > session.codeExpiresAt;
};

/**
 * Check if session has exceeded max attempts
 * @param {Object} session - Session object
 * @returns {boolean} True if exceeded
 */
const hasExceededAttempts = (session) => {
    return session.attempts >= session.maxAttempts;
};

/**
 * Increment attempt counter for session
 * @param {Object} session - Session object
 * @returns {Object} Updated session
 */
const incrementAttempts = (session) => {
    session.attempts++;
    return session;
};

/**
 * Get remaining attempts
 * @param {Object} session - Session object
 * @returns {number} Remaining attempts
 */
const getRemainingAttempts = (session) => {
    return session.maxAttempts - session.attempts;
};

/**
 * Get remaining time in seconds
 * @param {Object} session - Session object
 * @returns {number} Remaining seconds
 */
const getRemainingSeconds = (session) => {
    const remaining = (session.codeExpiresAt - new Date()) / 1000;
    return Math.max(0, Math.floor(remaining));
};

// ============================================
// Rate Limiting for 2FA Requests
// ============================================

const requestCounts = new Map();

/**
 * Check if user has exceeded 2FA request rate limit
 * @param {string} userId - User ID
 * @returns {boolean} True if rate limited
 */
const isRateLimited = (userId) => {
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxRequests = 5;
    
    const userRequests = requestCounts.get(userId) || [];
    const recentRequests = userRequests.filter(timestamp => now - timestamp < windowMs);
    
    return recentRequests.length >= maxRequests;
};

/**
 * Record a 2FA request for rate limiting
 * @param {string} userId - User ID
 */
const recordRequest = (userId) => {
    const now = Date.now();
    const userRequests = requestCounts.get(userId) || [];
    userRequests.push(now);
    requestCounts.set(userId, userRequests);
    
    // Clean up old entries after 1 hour
    setTimeout(() => {
        const current = requestCounts.get(userId) || [];
        const filtered = current.filter(t => now - t < 15 * 60 * 1000);
        if (filtered.length === 0) {
            requestCounts.delete(userId);
        } else {
            requestCounts.set(userId, filtered);
        }
    }, 60 * 60 * 1000);
};

// ============================================
// Utility Functions
// ============================================

/**
 * Validate 6-digit code format
 * @param {string} code - Code to validate
 * @returns {boolean} True if valid
 */
const isValidCodeFormat = (code) => {
    return /^\d{6}$/.test(code);
};

/**
 * Generate a random session ID
 * @returns {string} Random session ID
 */
const generateSessionId = () => {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * Get TOTP configuration for display
 * @returns {Object} TOTP configuration
 */
const getTOTPConfig = () => {
    return {
        algorithm: TWO_FA_CONFIG.totp.algorithm,
        digits: TWO_FA_CONFIG.totp.digits,
        period: TWO_FA_CONFIG.totp.period
    };
};

// ============================================
// Module Exports
// ============================================

module.exports = {
    // TOTP (Authenticator App)
    generateTOTPSecret,
    generateQRCode,
    verifyTOTPCode,
    getTOTPConfig,
    
    // Email/SMS Codes
    generateEmailCode,
    generateSecureCode,
    isValidCodeFormat,
    
    // Backup Codes
    generateBackupCodes,
    hashBackupCodes,
    verifyBackupCode,
    removeUsedBackupCode,
    
    // Session Management
    create2FASession,
    isSessionExpired,
    hasExceededAttempts,
    incrementAttempts,
    getRemainingAttempts,
    getRemainingSeconds,
    
    // Rate Limiting
    isRateLimited,
    recordRequest,
    
    // Utilities
    generateSessionId
};