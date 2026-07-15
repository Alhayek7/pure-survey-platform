/**
 * Authentication Routes
 * Defines all authentication and security endpoints
 * 
 * @module routes/auth.routes
 * @requires express
 * @requires ../controllers/auth.controller
 * @requires ../middleware/rateLimit
 * @requires ../middleware/recaptcha
 * @requires ../middleware/auth
 */

const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { authLimiter, strictLimiter, generalLimiter } = require('../middleware/rateLimit');
const { authRecaptchaMiddleware, optionalRecaptchaMiddleware } = require('../middleware/recaptcha');
const { authenticate } = require('../middleware/auth');

// ============================================
// Public Routes (No Authentication Required)
// ============================================

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 * @body    { name, email, password }
 */
router.post(
    '/register',
    authLimiter,
    authRecaptchaMiddleware,
    authController.register
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user (Step 1: Verify credentials)
 * @access  Public
 * @body    { email, password }
 */
router.post(
    '/login',
    authLimiter,
    optionalRecaptchaMiddleware,
    authController.login
);

/**
 * @route   POST /api/v1/auth/verify-2fa
 * @desc    Verify 2FA code (Step 2: Complete login)
 * @access  Public
 * @body    { sessionId, code }
 */
router.post(
    '/verify-2fa',
    authLimiter,
    authController.verifyTwoFactor
);

/**
 * @route   POST /api/v1/auth/resend-2fa
 * @desc    Resend 2FA verification code
 * @access  Public
 * @body    { sessionId }
 */
router.post(
    '/resend-2fa',
    strictLimiter,
    authController.resendTwoFactorCode
);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset email
 * @access  Public
 * @body    { email }
 */
router.post(
    '/forgot-password',
    strictLimiter,
    optionalRecaptchaMiddleware,
    authController.forgotPassword
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password using token
 * @access  Public
 * @body    { token, newPassword }
 */
router.post(
    '/reset-password',
    strictLimiter,
    optionalRecaptchaMiddleware,
    authController.resetPassword
);

/**
 * @route   POST /api/v1/auth/resend-verification
 * @desc    Resend email verification link
 * @access  Public
 * @body    { email }
 */
router.post(
    '/resend-verification',
    strictLimiter,
    authController.resendVerificationEmail
);

/**
 * @route   GET /api/v1/auth/verify-email
 * @desc    Verify user email address
 * @access  Public
 * @query   { token }
 */
router.get(
    '/verify-email',
    authController.verifyEmail
);

// ============================================
// Protected Routes (Authentication Required)
// ============================================

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get(
    '/me',
    authenticate,
    authController.getMe
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user (invalidate token)
 * @access  Private
 */
router.post(
    '/logout',
    authenticate,
    authController.logout
);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change user password
 * @access  Private
 * @body    { currentPassword, newPassword }
 */
router.post(
    '/change-password',
    authenticate,
    generalLimiter,
    authController.changePassword
);

/**
 * @route   POST /api/v1/auth/enable-2fa
 * @desc    Enable two-factor authentication
 * @access  Private
 */
router.post(
    '/enable-2fa',
    authenticate,
    authController.enableTwoFactor
);

/**
 * @route   POST /api/v1/auth/disable-2fa
 * @desc    Disable two-factor authentication
 * @access  Private
 * @body    { code }
 */
router.post(
    '/disable-2fa',
    authenticate,
    authController.disableTwoFactor
);

/**
 * @route   POST /api/v1/auth/verify-2fa-setup
 * @desc    Verify 2FA code during setup
 * @access  Private
 * @body    { code, backupCode }
 */
router.post(
    '/verify-2fa-setup',
    authenticate,
    authController.verifyTwoFactorSetup
);

/**
 * @route   GET /api/v1/auth/2fa-setup
 * @desc    Get 2FA setup information (QR code, secret)
 * @access  Private
 */
router.get(
    '/2fa-setup',
    authenticate,
    authController.getTwoFactorSetup
);

/**
 * @route   POST /api/v1/auth/backup-codes
 * @desc    Generate new backup codes
 * @access  Private
 */
router.post(
    '/backup-codes',
    authenticate,
    authController.generateBackupCodes
);

/**
 * @route   POST /api/v1/auth/verify-backup-code
 * @desc    Verify backup code (for 2FA recovery)
 * @access  Public
 * @body    { email, backupCode }
 */
router.post(
    '/verify-backup-code',
    authLimiter,
    authController.verifyBackupCode
);

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Refresh access token using refresh token
 * @access  Public
 * @body    { refreshToken }
 */
router.post(
    '/refresh-token',
    generalLimiter,
    authController.refreshToken
);

/**
 * @route   POST /api/v1/auth/revoke-all-sessions
 * @desc    Revoke all user sessions (logout from all devices)
 * @access  Private
 */
router.post(
    '/revoke-all-sessions',
    authenticate,
    authController.revokeAllSessions
);

/**
 * @route   GET /api/v1/auth/sessions
 * @desc    Get all active sessions for current user
 * @access  Private
 */
router.get(
    '/sessions',
    authenticate,
    authController.getActiveSessions
);

/**
 * @route   DELETE /api/v1/auth/sessions/:sessionId
 * @desc    Revoke specific session
 * @access  Private
 */
router.delete(
    '/sessions/:sessionId',
    authenticate,
    authController.revokeSession
);

// ============================================
// Admin Only Routes
// ============================================

/**
 * @route   GET /api/v1/auth/users
 * @desc    Get all users (admin only)
 * @access  Private/Admin
 */
router.get(
    '/users',
    authenticate,
    authController.getAllUsers
);

/**
 * @route   PUT /api/v1/auth/users/:userId/role
 * @desc    Change user role (admin only)
 * @access  Private/Admin
 * @body    { role }
 */
router.put(
    '/users/:userId/role',
    authenticate,
    authController.changeUserRole
);

/**
 * @route   PUT /api/v1/auth/users/:userId/status
 * @desc    Activate/deactivate user (admin only)
 * @access  Private/Admin
 * @body    { isActive }
 */
router.put(
    '/users/:userId/status',
    authenticate,
    authController.changeUserStatus
);

/**
 * @route   DELETE /api/v1/auth/users/:userId
 * @desc    Delete user (admin only)
 * @access  Private/Admin
 */
router.delete(
    '/users/:userId',
    authenticate,
    authController.deleteUser
);

// ============================================
// Security & Health Routes
// ============================================

/**
 * @route   GET /api/v1/auth/security-config
 * @desc    Get security configuration for frontend
 * @access  Public
 */
router.get(
    '/security-config',
    (req, res) => {
        res.json({
            success: true,
            data: {
                recaptcha: {
                    enabled: process.env.ENABLE_RECAPTCHA === 'true',
                    siteKey: process.env.RECAPTCHA_SITE_KEY
                },
                twoFactor: {
                    enabled: process.env.ENABLE_2FA === 'true',
                    appName: process.env.TWO_FA_APP_NAME
                },
                rateLimits: {
                    maxRequests: 100,
                    windowMs: 15 * 60 * 1000
                },
                passwordPolicy: {
                    minLength: 6,
                    requireNumbers: false,
                    requireUppercase: false,
                    requireSpecialChars: false
                }
            }
        });
    }
);

/**
 * @route   POST /api/v1/auth/check-email
 * @desc    Check if email is available (without registration)
 * @access  Public
 * @body    { email }
 */
router.post(
    '/check-email',
    generalLimiter,
    authController.checkEmailAvailability
);

module.exports = router;