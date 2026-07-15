const Notification = require('../models/notification.model');
const { Op } = require('sequelize');

/**
 * إنشاء إشعار جديد
 */
async function createNotification(notificationData) {
    try {
        const notification = await Notification.create(notificationData);
        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
}

/**
 * جلب إشعارات المستخدم
 */
async function getUserNotifications(userId, page = 1, limit = 20) {
    try {
        const offset = (page - 1) * limit;
        const { count, rows } = await Notification.findAndCountAll({
            where: { user_id: userId },
            order: [['created_at', 'DESC']],
            limit,
            offset
        });
        
        return {
            notifications: rows,
            total: count,
            page,
            totalPages: Math.ceil(count / limit)
        };
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return { notifications: [], total: 0, page: 1, totalPages: 0 };
    }
}

/**
 * جلب عدد الإشعارات غير المقروءة
 */
async function getUnreadCount(userId) {
    try {
        const count = await Notification.count({
            where: { user_id: userId, is_read: false }
        });
        return count;
    } catch (error) {
        console.error('Error getting unread count:', error);
        return 0;
    }
}

/**
 * تحديد إشعار كمقروء
 */
async function markAsRead(notificationId, userId) {
    try {
        const notification = await Notification.findOne({
            where: { id: notificationId, user_id: userId }
        });
        
        if (!notification) return false;
        
        notification.is_read = true;
        notification.read_at = new Date();
        await notification.save();
        return true;
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return false;
    }
}

/**
 * تحديد جميع الإشعارات كمقروءة
 */
async function markAllAsRead(userId) {
    try {
        await Notification.update(
            { is_read: true, read_at: new Date() },
            { where: { user_id: userId, is_read: false } }
        );
        return true;
    } catch (error) {
        console.error('Error marking all as read:', error);
        return false;
    }
}

/**
 * حذف إشعار
 */
async function deleteNotification(notificationId, userId) {
    try {
        const deleted = await Notification.destroy({
            where: { id: notificationId, user_id: userId }
        });
        return deleted > 0;
    } catch (error) {
        console.error('Error deleting notification:', error);
        return false;
    }
}

/**
 * إنشاء إشعار لاستبيان جديد
 */
async function notifyNewSurvey(survey, userId) {
    return await createNotification({
        user_id: userId,
        type: 'survey',
        title: 'استبيان جديد',
        message: `تم إنشاء استبيان جديد: "${survey.title}"`,
        actionable: true,
        action_type: 'survey',
        action_id: survey.id
    });
}

/**
 * إنشاء إشعار لردود جديدة
 */
async function notifyNewResponses(survey, responseCount, userId) {
    return await createNotification({
        user_id: userId,
        type: 'response',
        title: 'ردود جديدة',
        message: `استقبلت ${responseCount} ردود جديدة على استبيان "${survey.title}"`,
        actionable: true,
        action_type: 'survey',
        action_id: survey.id
    });
}

/**
 * إنشاء إشعار لمستخدم جديد
 */
async function notifyNewUser(newUser, adminId) {
    return await createNotification({
        user_id: adminId,
        type: 'user',
        title: 'مستخدم جديد',
        message: `انضم مستخدم جديد: ${newUser.name}`,
        actionable: true,
        action_type: 'user',
        action_id: newUser.id
    });
}

module.exports = {
    createNotification,
    getUserNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    notifyNewSurvey,
    notifyNewResponses,
    notifyNewUser
};