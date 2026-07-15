const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const notificationController = require('../controllers/notification.controller');

// جميع مسارات الإشعارات تحتاج إلى مصادقة
router.use(authenticate);

// جلب الإشعارات
router.get('/', notificationController.getNotifications);

// جلب عدد الإشعارات غير المقروءة
router.get('/unread/count', notificationController.getUnreadCount);

// تحديد إشعار كمقروء
router.put('/:id/read', notificationController.markAsRead);

// تحديد جميع الإشعارات كمقروءة
router.put('/read-all', notificationController.markAllAsRead);

// حذف إشعار
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;