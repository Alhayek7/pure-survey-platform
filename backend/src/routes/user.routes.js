/**
 * User Routes
 * Handles user management endpoints (Admin only for most operations)
 * 
 * @module routes/user.routes
 * @requires express
 * @requires ../controllers/user.controller
 * @requires ../middleware/auth
 * @requires ../middleware/rateLimit
 */

const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.controller');
const { authenticate, requireAdmin, requireOwnerOrAdmin } = require('../middleware/auth');
const { generalLimiter, strictLimiter } = require('../middleware/rateLimit');

// ============================================
// All routes require authentication
// ============================================
router.use(authenticate);

// ============================================
// User Profile Routes (Authenticated users)
// ============================================

/**
 * @route   GET /api/v1/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', userController.getCurrentUser);

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/profile', generalLimiter, userController.updateProfile);

/**
 * @route   GET /api/v1/users/export-data
 * @desc    Export user data (GDPR)
 * @access  Private
 */
router.get('/export-data', userController.exportUserData);

/**
 * @route   DELETE /api/v1/users/account
 * @desc    Delete own account
 * @access  Private
 */
router.delete('/account', strictLimiter, userController.deleteOwnAccount);

// ============================================
// User Statistics (Admin only)
// ============================================

/**
 * @route   GET /api/v1/users/stats/summary
 * @desc    Get user statistics (Admin only)
 * @access  Private/Admin
 */
router.get('/stats/summary', requireAdmin, userController.getUserStats);

// ============================================
// User Management (Admin only)
// ============================================

/**
 * @route   GET /api/v1/users
 * @desc    Get all users with pagination
 * @access  Private/Admin
 */
router.get('/', requireAdmin, userController.getAllUsers);

/**
 * @route   GET /api/v1/users/deleted
 * @desc    Get soft deleted users
 * @access  Private/Admin
 */
router.get('/deleted', requireAdmin, userController.getDeletedUsers);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get single user by ID
 * @access  Private/Admin
 */
router.get('/:id', requireAdmin, userController.getUserById);

/**
 * @route   PUT /api/v1/users/:id/role
 * @desc    Update user role
 * @access  Private/Admin
 */
router.put('/:id/role', requireAdmin, generalLimiter, userController.updateUserRole);

/**
 * @route   PUT /api/v1/users/:id/status
 * @desc    Activate/Deactivate user account
 * @access  Private/Admin
 */
router.put('/:id/status', requireAdmin, generalLimiter, userController.updateUserStatus);

/**
 * @route   POST /api/v1/users/:id/restore
 * @desc    Restore soft deleted user
 * @access  Private/Admin
 */
router.post('/:id/restore', requireAdmin, userController.restoreUser);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Soft delete user
 * @access  Private/Admin
 */
router.delete('/:id', requireAdmin, userController.deleteUser);

/**
 * @route   DELETE /api/v1/users/:id/permanent
 * @desc    Permanently delete user (hard delete)
 * @access  Private/Admin
 */
router.delete('/:id/permanent', requireAdmin, strictLimiter, userController.permanentDeleteUser);

// ============================================
// Batch Operations (Admin only)
// ============================================

/**
 * @route   POST /api/v1/users/batch/activate
 * @desc    Activate multiple users
 * @access  Private/Admin
 */
router.post('/batch/activate', requireAdmin, generalLimiter, userController.batchActivateUsers);

/**
 * @route   POST /api/v1/users/batch/deactivate
 * @desc    Deactivate multiple users
 * @access  Private/Admin
 */
router.post('/batch/deactivate', requireAdmin, generalLimiter, userController.batchDeactivateUsers);

/**
 * @route   POST /api/v1/users/batch/delete
 * @desc    Delete multiple users
 * @access  Private/Admin
 */
router.post('/batch/delete', requireAdmin, strictLimiter, userController.batchDeleteUsers);

/**
 * @route   POST /api/v1/users/batch/role
 * @desc    Update role for multiple users
 * @access  Private/Admin
 */
router.post('/batch/role', requireAdmin, generalLimiter, userController.batchUpdateRole);

// ============================================
// User Search and Export (Admin only)
// ============================================

/**
 * @route   GET /api/v1/users/search
 * @desc    Search users by name or email
 * @access  Private/Admin
 */
router.get('/search/:query', requireAdmin, userController.searchUsers);

/**
 * @route   GET /api/v1/users/export/csv
 * @desc    Export users to CSV
 * @access  Private/Admin
 */
router.get('/export/csv', requireAdmin, userController.exportUsersCSV);

/**
 * @route   GET /api/v1/users/export/excel
 * @desc    Export users to Excel
 * @access  Private/Admin
 */
router.get('/export/excel', requireAdmin, userController.exportUsersExcel);

// ============================================
// User Activity Logs (Admin only)
// ============================================

/**
 * @route   GET /api/v1/users/:id/activity
 * @desc    Get user activity logs
 * @access  Private/Admin
 */
router.get('/:id/activity', requireAdmin, userController.getUserActivity);

/**
 * @route   GET /api/v1/users/:id/sessions
 * @desc    Get user active sessions
 * @access  Private/Admin
 */
router.get('/:id/sessions', requireAdmin, userController.getUserSessions);

/**
 * @route   DELETE /api/v1/users/:id/sessions
 * @desc    Terminate all user sessions
 * @access  Private/Admin
 */
router.delete('/:id/sessions', requireAdmin, userController.terminateUserSessions);

// ============================================
// Profile Image Upload
// ============================================

/**
 * @route   POST /api/v1/users/profile/image
 * @desc    Upload profile image
 * @access  Private
 */
router.post('/profile/image', generalLimiter, userController.uploadProfileImage);

/**
 * @route   DELETE /api/v1/users/profile/image
 * @desc    Remove profile image
 * @access  Private
 */
router.delete('/profile/image', userController.removeProfileImage);

// ============================================
// Notification Settings
// ============================================

/**
 * @route   GET /api/v1/users/notifications/settings
 * @desc    Get notification settings
 * @access  Private
 */
router.get('/notifications/settings', userController.getNotificationSettings);

/**
 * @route   PUT /api/v1/users/notifications/settings
 * @desc    Update notification settings
 * @access  Private
 */
router.put('/notifications/settings', generalLimiter, userController.updateNotificationSettings);

// ============================================
// Module Exports
// ============================================

module.exports = router;