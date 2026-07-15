/**
 * Authentication Middleware
 * Handles JWT verification, role-based access control, and session validation
 * 
 * @module middleware/auth
 * @requires ../utils/token.util
 * @requires ../models/user.model
 * @requires ../config/logger
 */

const tokenUtil = require('../utils/token.util');
const User = require('../models/user.model');
const logger = require('../config/logger');

// ============================================
// Core Authentication Middleware
// ============================================

/**
 * Authenticate user using JWT token from Authorization header
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticate = async (req, res, next) => {
    try {
        // Extract token from header
        const authHeader = req.headers.authorization;
        const token = tokenUtil.extractTokenFromHeader(authHeader);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'غير مصرح بالوصول. يرجى تسجيل الدخول.',
                code: 'MISSING_TOKEN'
            });
        }

        // Verify token
        let decoded;
        try {
            decoded = tokenUtil.verifyToken(token);
        } catch (error) {
            if (error.message === 'Token has expired') {
                return res.status(401).json({
                    success: false,
                    message: 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.',
                    code: 'TOKEN_EXPIRED',
                    requiresRefresh: true
                });
            }
            return res.status(401).json({
                success: false,
                message: 'رمز التحقق غير صالح.',
                code: 'INVALID_TOKEN'
            });
        }

        // Check if token is blacklisted (logout)
        if (tokenUtil.isTokenBlacklisted(token)) {
            return res.status(401).json({
                success: false,
                message: 'تم تسجيل الخروج. يرجى تسجيل الدخول مرة أخرى.',
                code: 'TOKEN_BLACKLISTED'
            });
        }

        // Get user from database
        const user = await User.findByPk(decoded.id, {
            attributes: { exclude: ['password_hash', 'two_factor_secret', 'two_factor_backup_codes'] }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'المستخدم غير موجود.',
                code: 'USER_NOT_FOUND'
            });
        }

        // Check if user is active
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'الحساب غير نشط. يرجى التواصل مع الدعم الفني.',
                code: 'ACCOUNT_INACTIVE'
            });
        }

        // Check if account is locked
        if (user.isLocked()) {
            const remainingMinutes = user.getLockRemainingMinutes();
            return res.status(403).json({
                success: false,
                message: `الحساب مقفل مؤقتاً. يرجى المحاولة بعد ${remainingMinutes} دقيقة.`,
                code: 'ACCOUNT_LOCKED',
                remainingMinutes
            });
        }

        // Attach user to request object
        req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            is_active: user.is_active,
            two_factor_enabled: user.two_factor_enabled
        };

        // Attach token for potential blacklisting on logout
        req.token = token;

        next();

    } catch (error) {
        logger.error('Authentication middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء التحقق من الهوية.',
            code: 'AUTH_ERROR'
        });
    }
};

// ============================================
// Role-Based Access Control (RBAC) Middleware
// ============================================

/**
 * Check if user has required role
 * @param {...string} roles - Allowed roles
 * @returns {Function} Express middleware
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'غير مصرح بالوصول. يرجى تسجيل الدخول.',
                code: 'UNAUTHORIZED'
            });
        }

        if (!roles.includes(req.user.role)) {
            logger.warn(`Access denied: User ${req.user.email} (${req.user.role}) attempted to access ${req.originalUrl} (requires ${roles.join(', ')})`);
            
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول إلى هذه الصفحة.',
                code: 'FORBIDDEN',
                requiredRoles: roles,
                userRole: req.user.role
            });
        }

        next();
    };
};

/**
 * Check if user is admin
 */
const requireAdmin = requireRole('admin');

/**
 * Check if user is admin or researcher
 */
const requireAdminOrResearcher = requireRole('admin', 'researcher');

/**
 * Check if user is the owner or admin
 * @param {Function} getResourceOwnerId - Function to extract owner ID from request
 * @returns {Function} Express middleware
 */
const requireOwnerOrAdmin = (getResourceOwnerId) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'غير مصرح بالوصول.',
                code: 'UNAUTHORIZED'
            });
        }

        // Admin has full access
        if (req.user.role === 'admin') {
            return next();
        }

        try {
            const ownerId = await getResourceOwnerId(req);
            if (req.user.id !== ownerId) {
                return res.status(403).json({
                    success: false,
                    message: 'ليس لديك صلاحية الوصول إلى هذا المورد.',
                    code: 'FORBIDDEN'
                });
            }
            next();
        } catch (error) {
            logger.error('Owner check error:', error);
            res.status(500).json({
                success: false,
                message: 'حدث خطأ أثناء التحقق من الصلاحيات.',
                code: 'OWNER_CHECK_ERROR'
            });
        }
    };
};

// ============================================
// Permission-Specific Middleware
// ============================================

/**
 * Check if user has specific permission
 * @param {string} permission - Permission name
 * @returns {Function} Express middleware
 */
const hasPermission = (permission) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'غير مصرح بالوصول.',
                code: 'UNAUTHORIZED'
            });
        }

        // Admin has all permissions
        if (req.user.role === 'admin') {
            return next();
        }

        // Define role-based permissions
        const rolePermissions = {
            researcher: [
                'create_survey',
                'edit_own_survey',
                'delete_own_survey',
                'view_own_survey_responses',
                'export_own_survey'
            ],
            user: [
                'answer_survey',
                'view_own_responses'
            ]
        };

        const userPermissions = rolePermissions[req.user.role] || [];
        
        if (!userPermissions.includes(permission)) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لتنفيذ هذا الإجراء.',
                code: 'PERMISSION_DENIED',
                requiredPermission: permission
            });
        }

        next();
    };
};

// ============================================
// Optional Authentication (for public endpoints)
// ============================================

/**
 * Optional authentication - doesn't fail if no token, but attaches user if available
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = tokenUtil.extractTokenFromHeader(authHeader);

        if (!token) {
            return next();
        }

        // Verify token but don't fail if invalid
        try {
            const decoded = tokenUtil.verifyToken(token);
            
            if (!tokenUtil.isTokenBlacklisted(token)) {
                const user = await User.findByPk(decoded.id);
                if (user && user.is_active) {
                    req.user = {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role
                    };
                }
            }
        } catch (error) {
            // Token invalid but that's okay for optional auth
            logger.debug('Optional auth: invalid token provided');
        }
        
        next();
    } catch (error) {
        logger.error('Optional auth error:', error);
        next();
    }
};

// ============================================
// Session Management Middleware
// ============================================

/**
 * Track user session for analytics and security
 */
const trackSession = async (req, res, next) => {
    if (req.user) {
        // Add session tracking logic here
        // e.g., record last activity, session duration, etc.
        
        // Update last activity timestamp (optional)
        // This could be stored in Redis or database
        req.sessionLastActivity = new Date();
    }
    next();
};

/**
 * Rate limiting based on user role (different limits for different roles)
 */
const roleBasedRateLimit = (baseLimit = 100) => {
    return async (req, res, next) => {
        if (!req.user) {
            return next();
        }

        // Higher limits for admins, lower for regular users
        const limits = {
            admin: baseLimit * 2,
            researcher: baseLimit,
            user: Math.floor(baseLimit * 0.5)
        };

        const userLimit = limits[req.user.role] || baseLimit;
        
        // Apply rate limit based on user role
        // This would integrate with the rate limiter store
        req.rateLimit = userLimit;
        
        next();
    };
};

// ============================================
// CSRF Protection Middleware (for state-changing operations)
// ============================================

/**
 * Verify CSRF token for non-GET requests
 */
const verifyCSRF = (req, res, next) => {
    // Skip for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // For development/testing, you can skip CSRF
    if (process.env.NODE_ENV === 'development' && req.headers['x-disable-csrf'] === 'true') {
        return next();
    }

    const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
    
    if (!csrfToken) {
        return res.status(403).json({
            success: false,
            message: 'CSRF token missing.',
            code: 'CSRF_MISSING'
        });
    }

    const sessionId = req.user?.id || req.session?.id;
    if (!sessionId) {
        return res.status(403).json({
            success: false,
            message: 'Invalid session.',
            code: 'INVALID_SESSION'
        });
    }

    if (!tokenUtil.verifyCSRFToken(csrfToken, sessionId.toString())) {
        return res.status(403).json({
            success: false,
            message: 'Invalid CSRF token.',
            code: 'CSRF_INVALID'
        });
    }

    next();
};

// ============================================
// Module Exports
// ============================================

module.exports = {
    // Core authentication
    authenticate,
    optionalAuth,
    
    // Role-based access control
    requireRole,
    requireAdmin,
    requireAdminOrResearcher,
    requireOwnerOrAdmin,
    
    // Permission-based access control
    hasPermission,
    
    // Session management
    trackSession,
    roleBasedRateLimit,
    
    // CSRF protection
    verifyCSRF
};