/**
 * User Controller
 * Handles user management operations (Admin only)
 * 
 * @module controllers/user.controller
 * @requires ../models/user.model
 * @requires ../services/email.service
 * @requires ../utils/token.util
 * @requires ../config/logger
 */

const User = require('../models/user.model');
const emailService = require('../services/email.service');
const tokenUtil = require('../utils/token.util');
const logger = require('../config/logger');
const { Op } = require('sequelize');

// ============================================
// Get All Users
// ============================================

/**
 * Get all users with pagination and filters
 * GET /api/v1/users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllUsers = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            role = '',
            is_active = '',
            sortBy = 'created_at',
            sortOrder = 'DESC'
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Build where clause
        const where = {};
        
        if (search) {
            where[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { email: { [Op.iLike]: `%${search}%` } }
            ];
        }
        
        if (role) {
            where.role = role;
        }
        
        if (is_active !== '') {
            where.is_active = is_active === 'true';
        }

        const { count, rows } = await User.findAndCountAll({
            where,
            attributes: { exclude: ['password_hash', 'two_factor_secret', 'two_factor_backup_codes'] },
            limit: parseInt(limit),
            offset,
            order: [[sortBy, sortOrder]],
            paranoid: false
        });

        res.status(200).json({
            success: true,
            data: {
                users: rows,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(count / parseInt(limit))
                }
            }
        });

    } catch (error) {
        logger.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء جلب المستخدمين'
        });
    }
};

/**
 * Get single user by ID
 * GET /api/v1/users/:id
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByPk(id, {
            attributes: { exclude: ['password_hash', 'two_factor_secret', 'two_factor_backup_codes'] }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });

    } catch (error) {
        logger.error('Get user by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء جلب المستخدم'
        });
    }
};

// ============================================
// User Management (Admin Only)
// ============================================

/**
 * Update user role
 * PUT /api/v1/users/:id/role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        // Validate role
        const validRoles = ['admin', 'researcher', 'user'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'دور غير صالح'
            });
        }

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }

        // Prevent changing own role (optional security)
        if (parseInt(id) === req.user.id && role !== user.role) {
            return res.status(403).json({
                success: false,
                message: 'لا يمكنك تغيير دور حسابك الخاص'
            });
        }

        const oldRole = user.role;
        user.role = role;
        await user.save();

        logger.info(`User role updated: ${user.email} from ${oldRole} to ${role} by ${req.user.email}`);

        res.status(200).json({
            success: true,
            message: 'تم تحديث دور المستخدم بنجاح',
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        logger.error('Update user role error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء تحديث دور المستخدم'
        });
    }
};

/**
 * Activate/Deactivate user account
 * PUT /api/v1/users/:id/status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        if (typeof is_active !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'قيمة الحالة غير صالحة'
            });
        }

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }

        // Prevent deactivating own account
        if (parseInt(id) === req.user.id && !is_active) {
            return res.status(403).json({
                success: false,
                message: 'لا يمكنك تعطيل حسابك الخاص'
            });
        }

        user.is_active = is_active;
        await user.save();

        // Send notification email
        if (!is_active) {
            await emailService.sendAccountStatusEmail(user.email, user.name, 'deactivated');
        } else {
            await emailService.sendAccountStatusEmail(user.email, user.name, 'reactivated');
        }

        logger.info(`User status updated: ${user.email} is_active=${is_active} by ${req.user.email}`);

        res.status(200).json({
            success: true,
            message: is_active ? 'تم تفعيل الحساب بنجاح' : 'تم تعطيل الحساب بنجاح',
            data: {
                id: user.id,
                is_active: user.is_active
            }
        });

    } catch (error) {
        logger.error('Update user status error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء تحديث حالة المستخدم'
        });
    }
};

/**
 * Delete user (soft delete)
 * DELETE /api/v1/users/:id
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }

        // Prevent deleting own account
        if (parseInt(id) === req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'لا يمكنك حذف حسابك الخاص'
            });
        }

        // Prevent deleting the last admin
        if (user.role === 'admin') {
            const adminCount = await User.count({ where: { role: 'admin', is_active: true } });
            if (adminCount <= 1) {
                return res.status(400).json({
                    success: false,
                    message: 'لا يمكن حذف آخر مدير في النظام'
                });
            }
        }

        await user.softDelete(req.user.id);
        
        logger.info(`User deleted: ${user.email} by ${req.user.email}`);

        res.status(200).json({
            success: true,
            message: 'تم حذف المستخدم بنجاح'
        });

    } catch (error) {
        logger.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء حذف المستخدم'
        });
    }
};

/**
 * Permanently delete user (hard delete)
 * DELETE /api/v1/users/:id/permanent
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const permanentDeleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByPk(id, { paranoid: false });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }

        // Prevent deleting own account
        if (parseInt(id) === req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'لا يمكنك حذف حسابك الخاص'
            });
        }

        // Prevent deleting last admin
        if (user.role === 'admin') {
            const adminCount = await User.count({ where: { role: 'admin', is_active: true } });
            if (adminCount <= 1) {
                return res.status(400).json({
                    success: false,
                    message: 'لا يمكن حذف آخر مدير في النظام'
                });
            }
        }

        await user.destroy({ force: true });
        
        logger.info(`User permanently deleted: ${user.email} by ${req.user.email}`);

        res.status(200).json({
            success: true,
            message: 'تم حذف المستخدم نهائياً'
        });

    } catch (error) {
        logger.error('Permanent delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء حذف المستخدم'
        });
    }
};

/**
 * Restore soft deleted user
 * POST /api/v1/users/:id/restore
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const restoreUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByPk(id, { paranoid: false });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }

        if (!user.deleted_at) {
            return res.status(400).json({
                success: false,
                message: 'هذا المستخدم غير محذوف'
            });
        }

        await user.restore();
        
        logger.info(`User restored: ${user.email} by ${req.user.email}`);

        res.status(200).json({
            success: true,
            message: 'تم استعادة المستخدم بنجاح'
        });

    } catch (error) {
        logger.error('Restore user error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء استعادة المستخدم'
        });
    }
};

// ============================================
// User Profile Management
// ============================================

/**
 * Update user profile
 * PUT /api/v1/users/profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, email, recovery_email, recovery_phone } = req.body;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }

        // Check if email is being changed and if it's available
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'البريد الإلكتروني مستخدم بالفعل'
                });
            }
            user.email = email;
        }

        if (name) user.name = name;
        if (recovery_email !== undefined) user.recovery_email = recovery_email;
        if (recovery_phone !== undefined) user.recovery_phone = recovery_phone;

        user.updated_by = userId;
        await user.save();

        logger.info(`User profile updated: ${user.email}`);

        res.status(200).json({
            success: true,
            message: 'تم تحديث الملف الشخصي بنجاح',
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                recovery_email: user.recovery_email,
                recovery_phone: user.recovery_phone,
                role: user.role,
                two_factor_enabled: user.two_factor_enabled
            }
        });

    } catch (error) {
        logger.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء تحديث الملف الشخصي'
        });
    }
};

// ============================================
// Deleted Users (Admin only)
// ============================================

/**
 * Get deleted users (soft deleted)
 * GET /api/v1/users/deleted
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDeletedUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            where: {
                deleted_at: { [Op.ne]: null }
            },
            attributes: { exclude: ['password_hash', 'two_factor_secret', 'two_factor_backup_codes'] },
            paranoid: false,
            order: [['deleted_at', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: users
        });

    } catch (error) {
        logger.error('Get deleted users error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء جلب المستخدمين المحذوفين'
        });
    }
};

// ============================================
// User Statistics (Admin only)
// ============================================

/**
 * Get user statistics
 * GET /api/v1/users/stats/summary
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserStats = async (req, res) => {
    try {
        const total = await User.count();
        const active = await User.count({ where: { is_active: true } });
        const inactive = await User.count({ where: { is_active: false } });
        const admins = await User.count({ where: { role: 'admin' } });
        const researchers = await User.count({ where: { role: 'researcher' } });
        const users = await User.count({ where: { role: 'user' } });
        const with2FA = await User.count({ where: { two_factor_enabled: true } });
        const deleted = await User.count({ where: { deleted_at: { [Op.ne]: null } }, paranoid: false });

        // Get last 7 days registrations
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const newThisWeek = await User.count({
            where: {
                created_at: { [Op.gte]: sevenDaysAgo }
            }
        });

        // Get registrations per day for the last 7 days
        const dailyRegistrations = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            
            const count = await User.count({
                where: {
                    created_at: {
                        [Op.gte]: date,
                        [Op.lt]: nextDate
                    }
                }
            });
            
            dailyRegistrations.push({
                date: date.toLocaleDateString('ar-EG'),
                count
            });
        }

        res.status(200).json({
            success: true,
            data: {
                total,
                active,
                inactive,
                admins,
                researchers,
                users: users,
                with2FA,
                deleted,
                newThisWeek,
                dailyRegistrations
            }
        });

    } catch (error) {
        logger.error('Get user stats error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء جلب إحصائيات المستخدمين'
        });
    }
};

// ============================================
// Export User Data (GDPR)
// ============================================

/**
 * Export user data for GDPR compliance
 * GET /api/v1/users/export-data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const exportUserData = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const user = await User.findByPk(userId, {
            attributes: { exclude: ['password_hash', 'two_factor_secret'] },
            paranoid: false
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }

        // Get user's surveys, responses, etc.
        const surveys = await user.getSurveys();
        const responses = await user.getResponses();

        const exportData = {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                is_active: user.is_active,
                two_factor_enabled: user.two_factor_enabled,
                created_at: user.created_at,
                updated_at: user.updated_at,
                last_login_at: user.last_login_at,
                last_login_ip: user.last_login_ip
            },
            surveys: surveys.map(s => ({
                id: s.id,
                title: s.title,
                description: s.description,
                status: s.status,
                created_at: s.created_at
            })),
            responses: responses.map(r => ({
                id: r.id,
                survey_id: r.survey_id,
                submitted_at: r.submitted_at
            })),
            export_date: new Date().toISOString()
        };

        res.status(200).json({
            success: true,
            data: exportData
        });

    } catch (error) {
        logger.error('Export user data error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء تصدير البيانات'
        });
    }
};

// ============================================
// Module Exports
// ============================================

module.exports = {
    // User management
    getAllUsers,
    getUserById,
    updateUserRole,
    updateUserStatus,
    deleteUser,
    permanentDeleteUser,
    restoreUser,
    
    // Profile
    updateProfile,
    
    // Admin extras
    getDeletedUsers,
    getUserStats,
    
    // GDPR
    exportUserData
};