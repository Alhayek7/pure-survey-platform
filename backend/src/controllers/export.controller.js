/**
 * Authentication Controller
 * Handles user registration, login, 2FA, and session management
 * 
 * @module controllers/auth.controller
 * @requires ../services/auth.service
 * @requires ../services/email.service
 * @requires ../services/2fa.service
 * @requires ../utils/token.util
 */

const authService = require('../services/auth.service');
const emailService = require('../services/email.service');
const twoFAService = require('../services/2fa.service');
const tokenUtil = require('../utils/token.util');
const logger = require('../config/logger');

// ============================================
// Temporary storage for 2FA pending sessions
// In production, use Redis or database
// ============================================
const pending2FASessions = new Map();

// ============================================
// Public Routes
// ============================================

/**
 * User Registration
 * POST /api/v1/auth/register
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'الرجاء إدخال جميع البيانات المطلوبة'
            });
        }

        // Validate password strength
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'البريد الإلكتروني غير صالح'
            });
        }

        // Create user
        const result = await authService.register({ name, email, password });

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.message
            });
        }

        // Send welcome email (non-blocking)
        emailService.sendWelcomeEmail(email, name).catch(err => {
            logger.warn('Failed to send welcome email:', err.message);
        });

        // Generate token
        const token = tokenUtil.generateToken(result.user);

        res.status(201).json({
            success: true,
            message: 'تم إنشاء الحساب بنجاح',
            user: result.user,
            token
        });

    } catch (error) {
        logger.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء إنشاء الحساب'
        });
    }
};

/**
 * User Login (Step 1: Verify credentials)
 * POST /api/v1/auth/login
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'الرجاء إدخال البريد الإلكتروني وكلمة المرور'
            });
        }

        // Verify credentials
        const result = await authService.login({ email, password });

        if (!result.success) {
            return res.status(401).json({
                success: false,
                message: result.message || 'بيانات الدخول غير صحيحة'
            });
        }

        const user = result.user;

        // Check if 2FA is enabled for this user
        if (user.two_factor_enabled) {
            // Generate and send 2FA code
            const twoFACode = twoFAService.generateCode();
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

            // Store pending session
            const sessionId = tokenUtil.generateRandomId();
            pending2FASessions.set(sessionId, {
                userId: user.id,
                email: user.email,
                name: user.name,
                tempToken: result.token,
                code: twoFACode,
                codeExpiresAt: expiresAt,
                attempts: 0
            });

            // Send 2FA code via email
            await emailService.sendTwoFactorCode(user.email, twoFACode, user.name);

            // Auto-cleanup expired sessions after 10 minutes
            setTimeout(() => {
                if (pending2FASessions.has(sessionId)) {
                    pending2FASessions.delete(sessionId);
                    logger.info(`Cleaned up expired 2FA session for ${user.email}`);
                }
            }, 10 * 60 * 1000);

            return res.status(200).json({
                success: true,
                requiresTwoFactor: true,
                sessionId: sessionId,
                message: `تم إرسال رمز التحقق إلى ${maskEmail(user.email)}`,
                expiresIn: 300 // 5 minutes in seconds
            });
        }

        // No 2FA, return token directly
        res.status(200).json({
            success: true,
            message: 'تم تسجيل الدخول بنجاح',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                is_active: user.is_active
            },
            token: result.token
        });

    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء تسجيل الدخول'
        });
    }
};

/**
 * Verify 2FA Code (Step 2: Complete login)
 * POST /api/v1/auth/verify-2fa
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.verifyTwoFactor = async (req, res) => {
    try {
        const { sessionId, code } = req.body;

        if (!sessionId || !code) {
            return res.status(400).json({
                success: false,
                message: 'الرجاء إدخال رمز التحقق'
            });
        }

        // Get pending session
        const session = pending2FASessions.get(sessionId);
        if (!session) {
            return res.status(401).json({
                success: false,
                message: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى'
            });
        }

        // Check attempts limit
        if (session.attempts >= 5) {
            pending2FASessions.delete(sessionId);
            return res.status(401).json({
                success: false,
                message: 'تجاوزت عدد المحاولات المسموح بها، يرجى تسجيل الدخول مرة أخرى'
            });
        }

        // Check if code expired
        if (new Date() > session.codeExpiresAt) {
            pending2FASessions.delete(sessionId);
            return res.status(401).json({
                success: false,
                message: 'انتهت صلاحية الرمز، يرجى إعادة تسجيل الدخول'
            });
        }

        // Verify code
        if (session.code !== code) {
            session.attempts++;
            pending2FASessions.set(sessionId, session);
            
            const remainingAttempts = 5 - session.attempts;
            return res.status(401).json({
                success: false,
                message: `رمز التحقق غير صحيح، تبقى ${remainingAttempts} محاولات`
            });
        }

        // Code verified successfully
        pending2FASessions.delete(sessionId);

        // Get user data
        const user = await authService.getUserById(session.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }

        // Generate final token
        const finalToken = tokenUtil.generateToken(user);

        res.status(200).json({
            success: true,
            message: 'تم تسجيل الدخول بنجاح',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                is_active: user.is_active
            },
            token: finalToken
        });

    } catch (error) {
        logger.error('2FA verification error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء التحقق من الرمز'
        });
    }
};

/**
 * Resend 2FA Code
 * POST /api/v1/auth/resend-2fa
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.resendTwoFactorCode = async (req, res) => {
    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'معرف الجلسة مطلوب'
            });
        }

        const session = pending2FASessions.get(sessionId);
        if (!session) {
            return res.status(401).json({
                success: false,
                message: 'الجلسة غير صالحة أو منتهية'
            });
        }

        // Generate new code
        const newCode = twoFAService.generateCode();
        const newExpiry = new Date(Date.now() + 5 * 60 * 1000);

        session.code = newCode;
        session.codeExpiresAt = newExpiry;
        session.attempts = 0;
        pending2FASessions.set(sessionId, session);

        // Resend email
        await emailService.sendTwoFactorCode(session.email, newCode, session.name);

        res.status(200).json({
            success: true,
            message: `تم إعادة إرسال رمز التحقق إلى ${maskEmail(session.email)}`,
            expiresIn: 300
        });

    } catch (error) {
        logger.error('Resend 2FA error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء إعادة إرسال الرمز'
        });
    }
};

/**
 * Enable/Disable 2FA for authenticated user
 * POST /api/v1/auth/toggle-2fa
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.toggleTwoFactor = async (req, res) => {
    try {
        const userId = req.user.id;
        const { enable } = req.body;

        const result = await authService.toggleTwoFactor(userId, enable);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.message
            });
        }

        res.status(200).json({
            success: true,
            message: enable ? 'تم تفعيل المصادقة الثنائية' : 'تم إلغاء المصادقة الثنائية',
            two_factor_enabled: result.enabled
        });

    } catch (error) {
        logger.error('Toggle 2FA error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء تحديث إعدادات المصادقة'
        });
    }
};

/**
 * Get current authenticated user
 * GET /api/v1/auth/me
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getMe = async (req, res) => {
    try {
        const user = await authService.getUserById(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }

        res.status(200).json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                is_active: user.is_active,
                two_factor_enabled: user.two_factor_enabled,
                created_at: user.created_at,
                updated_at: user.updated_at
            }
        });

    } catch (error) {
        logger.error('Get me error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في جلب البيانات'
        });
    }
};

/**
 * Logout user
 * POST /api/v1/auth/logout
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.logout = async (req, res) => {
    try {
        // In a stateless JWT system, logout is handled client-side
        // But we can blacklist the token in production with Redis
        
        res.status(200).json({
            success: true,
            message: 'تم تسجيل الخروج بنجاح'
        });

    } catch (error) {
        logger.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء تسجيل الخروج'
        });
    }
};

// ============================================
// Helper Functions
// ============================================

/**
 * Mask email for privacy
 * @param {string} email - Original email
 * @returns {string} Masked email
 */
function maskEmail(email) {
    const [local, domain] = email.split('@');
    if (local.length <= 2) return email;
    const maskedLocal = local[0] + '***' + local[local.length - 1];
    return `${maskedLocal}@${domain}`;
}

/**
 * Clean up expired pending sessions (call periodically)
 */
function cleanupExpiredSessions() {
    const now = new Date();
    for (const [sessionId, session] of pending2FASessions.entries()) {
        if (now > session.codeExpiresAt) {
            pending2FASessions.delete(sessionId);
            logger.debug(`Cleaned up expired session: ${sessionId}`);
        }
    }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredSessions, 5 * 60 * 1000);

module.exports = exports;