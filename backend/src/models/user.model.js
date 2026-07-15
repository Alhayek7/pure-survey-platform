/**
 * User Model
 * Handles user data structure, validation, and database operations
 * 
 * @module models/user.model
 * @requires sequelize
 * @requires bcrypt
 * @requires ../config/database
 */

const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const sequelize = require('../config/database');
const logger = require('../config/logger');

// ============================================
// User Model Definition
// ============================================

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: { msg: 'الاسم مطلوب' },
            len: { args: [2, 100], msg: 'الاسم يجب أن يكون بين 2 و 100 حرف' }
        }
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: { msg: 'البريد الإلكتروني غير صالح' },
            notEmpty: { msg: 'البريد الإلكتروني مطلوب' }
        }
    },
    password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'password_hash'
    },
    role: {
        type: DataTypes.ENUM('admin', 'researcher', 'user'),
        defaultValue: 'user',
        allowNull: false
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },
    
    // ============================================
    // 2FA Fields (NEW)
    // ============================================
    two_factor_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        field: 'two_factor_enabled'
    },
    two_factor_secret: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'two_factor_secret'
    },
    two_factor_backup_codes: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'two_factor_backup_codes',
        get() {
            const rawValue = this.getDataValue('two_factor_backup_codes');
            if (!rawValue) return [];
            try {
                return JSON.parse(rawValue);
            } catch {
                return [];
            }
        },
        set(value) {
            if (Array.isArray(value)) {
                this.setDataValue('two_factor_backup_codes', JSON.stringify(value));
            } else {
                this.setDataValue('two_factor_backup_codes', value);
            }
        }
    },
    
    // ============================================
    // Security Fields (NEW)
    // ============================================
    last_login_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'last_login_at'
    },
    last_login_ip: {
        type: DataTypes.STRING(45),
        allowNull: true,
        field: 'last_login_ip'
    },
    failed_login_attempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        field: 'failed_login_attempts'
    },
    locked_until: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'locked_until'
    },
    password_changed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'password_changed_at'
    },
    password_reset_token: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'password_reset_token'
    },
    password_reset_expires: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'password_reset_expires'
    },
    
    // ============================================
    // Account Recovery (NEW)
    // ============================================
    recovery_email: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'recovery_email',
        validate: {
            isEmail: { msg: 'البريد الإلكتروني للاسترداد غير صالح' }
        }
    },
    recovery_phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'recovery_phone'
    },
    
    // ============================================
    // Audit Fields (NEW)
    // ============================================
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'created_by'
    },
    updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'updated_by'
    },
    deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'deleted_at'
    },
    deleted_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'deleted_by'
    }
}, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true, // Soft delete
    indexes: [
        { fields: ['email'], unique: true },
        { fields: ['role'] },
        { fields: ['is_active'] },
        { fields: ['two_factor_enabled'] },
        { fields: ['deleted_at'] }
    ]
});

// ============================================
// Instance Methods
// ============================================

/**
 * Compare plain text password with hashed password
 * @param {string} password - Plain text password
 * @returns {Promise<boolean>} True if passwords match
 */
User.prototype.validatePassword = async function(password) {
    if (!password || !this.password_hash) return false;
    return bcrypt.compare(password, this.password_hash);
};

/**
 * Update last login information
 * @param {string} ipAddress - Client IP address
 */
User.prototype.updateLastLogin = async function(ipAddress) {
    this.last_login_at = new Date();
    this.last_login_ip = ipAddress;
    this.failed_login_attempts = 0;
    this.locked_until = null;
    await this.save();
};

/**
 * Increment failed login attempts
 * @returns {Promise<boolean>} True if account should be locked
 */
User.prototype.incrementFailedAttempts = async function() {
    this.failed_login_attempts += 1;
    
    // Lock account after 5 failed attempts
    if (this.failed_login_attempts >= 5) {
        this.locked_until = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
        logger.warn(`Account locked for user: ${this.email} until ${this.locked_until}`);
    }
    
    await this.save();
    return this.failed_login_attempts >= 5;
};

/**
 * Check if account is locked
 * @returns {boolean} True if locked
 */
User.prototype.isLocked = function() {
    if (!this.locked_until) return false;
    if (new Date() > this.locked_until) {
        this.locked_until = null;
        this.save();
        return false;
    }
    return true;
};

/**
 * Get remaining lock time in minutes
 * @returns {number|null} Minutes remaining or null if not locked
 */
User.prototype.getLockRemainingMinutes = function() {
    if (!this.locked_until) return null;
    const remaining = (this.locked_until - new Date()) / (60 * 1000);
    return Math.max(0, Math.ceil(remaining));
};

/**
 * Enable 2FA for user
 * @param {string} secret - TOTP secret
 * @param {string[]} backupCodes - Backup codes
 */
User.prototype.enableTwoFactor = async function(secret, backupCodes = []) {
    this.two_factor_enabled = true;
    this.two_factor_secret = secret;
    this.two_factor_backup_codes = backupCodes;
    await this.save();
    logger.info(`2FA enabled for user: ${this.email}`);
};

/**
 * Disable 2FA for user
 */
User.prototype.disableTwoFactor = async function() {
    this.two_factor_enabled = false;
    this.two_factor_secret = null;
    this.two_factor_backup_codes = null;
    await this.save();
    logger.info(`2FA disabled for user: ${this.email}`);
};

/**
 * Check if password needs to be changed (older than 90 days)
 * @returns {boolean} True if password change required
 */
User.prototype.isPasswordExpired = function() {
    if (!this.password_changed_at) return true;
    const ninetyDays = 90 * 24 * 60 * 60 * 1000;
    return (Date.now() - new Date(this.password_changed_at)) > ninetyDays;
};

/**
 * Update password
 * @param {string} newPassword - New plain text password
 */
User.prototype.updatePassword = async function(newPassword) {
    const saltRounds = 10;
    this.password_hash = await bcrypt.hash(newPassword, saltRounds);
    this.password_changed_at = new Date();
    this.failed_login_attempts = 0;
    this.locked_until = null;
    await this.save();
    logger.info(`Password updated for user: ${this.email}`);
};

/**
 * Set password reset token
 * @param {string} token - Reset token
 * @param {Date} expiresAt - Expiry date
 */
User.prototype.setPasswordResetToken = async function(token, expiresAt) {
    this.password_reset_token = token;
    this.password_reset_expires = expiresAt;
    await this.save();
};

/**
 * Clear password reset token
 */
User.prototype.clearPasswordResetToken = async function() {
    this.password_reset_token = null;
    this.password_reset_expires = null;
    await this.save();
};

/**
 * Soft delete user
 * @param {number} deletedBy - ID of user performing deletion
 */
User.prototype.softDelete = async function(deletedBy) {
    this.deleted_at = new Date();
    this.deleted_by = deletedBy;
    this.is_active = false;
    await this.save();
    logger.info(`User soft deleted: ${this.email} by ${deletedBy}`);
};

/**
 * Restore soft deleted user
 */
User.prototype.restore = async function() {
    this.deleted_at = null;
    this.deleted_by = null;
    this.is_active = true;
    await this.save();
    logger.info(`User restored: ${this.email}`);
};

// ============================================
// Static Methods
// ============================================

/**
 * Create new user with hashed password
 * @param {Object} userData - User data (name, email, password, role)
 * @returns {Promise<User>} Created user
 */
User.createWithHash = async function(userData) {
    const { password, ...rest } = userData;
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    const user = await User.create({
        ...rest,
        password_hash,
        password_changed_at: new Date()
    });
    
    delete user.dataValues.password_hash;
    return user;
};

/**
 * Find user by email with error handling
 * @param {string} email - User email
 * @returns {Promise<User|null>} User or null
 */
User.findByEmail = async function(email) {
    return await User.findOne({
        where: { email: email.toLowerCase() },
        attributes: { exclude: ['password_hash'] }
    });
};

/**
 * Find user by email for authentication (includes password)
 * @param {string} email - User email
 * @returns {Promise<User|null>} User with password
 */
User.findByEmailForAuth = async function(email) {
    return await User.findOne({
        where: { email: email.toLowerCase() }
    });
};

/**
 * Get active users count
 * @returns {Promise<number>} Active users count
 */
User.getActiveCount = async function() {
    return await User.count({
        where: {
            is_active: true,
            deleted_at: null
        }
    });
};

/**
 * Get users by role
 * @param {string} role - User role
 * @returns {Promise<User[]>} Users with specified role
 */
User.findByRole = async function(role) {
    return await User.findAll({
        where: {
            role: role,
            is_active: true,
            deleted_at: null
        },
        attributes: { exclude: ['password_hash'] }
    });
};

/**
 * Search users by name or email
 * @param {string} query - Search query
 * @returns {Promise<User[]>} Matching users
 */
User.search = async function(query) {
    const { Op } = require('sequelize');
    return await User.findAll({
        where: {
            [Op.or]: [
                { name: { [Op.iLike]: `%${query}%` } },
                { email: { [Op.iLike]: `%${query}%` } }
            ],
            deleted_at: null
        },
        attributes: { exclude: ['password_hash'] },
        limit: 20
    });
};

// ============================================
// Hooks
// ============================================

/**
 * Hash password before creation
 */
User.beforeCreate(async (user) => {
    if (user.password_hash) {
        // Password already hashed by createWithHash
        return;
    }
});

/**
 * Log user creation
 */
User.afterCreate(async (user) => {
    logger.info(`New user created: ${user.email} (ID: ${user.id})`);
});

/**
 * Log user update
 */
User.afterUpdate(async (user) => {
    if (user.changed('role')) {
        logger.info(`User role changed: ${user.email} -> ${user.role}`);
    }
    if (user.changed('is_active') && !user.is_active) {
        logger.info(`User deactivated: ${user.email}`);
    }
});

// ============================================
// Module Exports
// ============================================

module.exports = User;