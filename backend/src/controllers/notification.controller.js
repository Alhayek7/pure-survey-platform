const notificationService = require('../services/notification.service');
const logger = require('../config/logger');

/**
 * جلب إشعارات المستخدم
 */
async function getNotifications(req, res) {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        
        const result = await notificationService.getUserNotifications(userId, page, limit);
        
        res.json({
            success: true,
            data: result.notifications,
            pagination: {
                page: result.page,
                limit,
                total: result.total,
                totalPages: result.totalPages
            }
        });
    } catch (error) {
        logger.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحميل الإشعارات'
        });
    }
}

/**
 * جلب عدد الإشعارات غير المقروءة
 */
async function getUnreadCount(req, res) {
    try {
        const userId = req.user.id;
        const count = await notificationService.getUnreadCount(userId);
        
        res.json({
            success: true,
            count
        });
    } catch (error) {
        logger.error('Get unread count error:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحميل عدد الإشعارات'
        });
    }
}

/**
 * تحديد إشعار كمقروء
 */
async function markAsRead(req, res) {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        
        const success = await notificationService.markAsRead(id, userId);
        
        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'الإشعار غير موجود'
            });
        }
        
        res.json({
            success: true,
            message: 'تم تحديد الإشعار كمقروء'
        });
    } catch (error) {
        logger.error('Mark as read error:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحديث الإشعار'
        });
    }
}

/**
 * تحديد جميع الإشعارات كمقروءة
 */
async function markAllAsRead(req, res) {
    try {
        const userId = req.user.id;
        await notificationService.markAllAsRead(userId);
        
        res.json({
            success: true,
            message: 'تم تحديد جميع الإشعارات كمقروءة'
        });
    } catch (error) {
        logger.error('Mark all as read error:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحديث الإشعارات'
        });
    }
}

/**
 * حذف إشعار
 */
async function deleteNotification(req, res) {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        
        const success = await notificationService.deleteNotification(id, userId);
        
        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'الإشعار غير موجود'
            });
        }
        
        res.json({
            success: true,
            message: 'تم حذف الإشعار'
        });
    } catch (error) {
        logger.error('Delete notification error:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في حذف الإشعار'
        });
    }
}

module.exports = {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
};