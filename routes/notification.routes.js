const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');

// Company notification routes
router.get('/company/:companyId', notificationController.getCompanyNotifications);

// Employee notification routes
router.get('/employee/:employeeId', notificationController.getEmployeeNotifications);

// Mark notification as read
router.put('/:notificationId/read', notificationController.markNotificationAsRead);

module.exports = router;