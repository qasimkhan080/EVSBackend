const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity.controller');
const companyAuth = require('../middlewares/companyAuth');

// Get recent activities
router.get('/', companyAuth, activityController.getRecentActivities);

// Clear all activities
router.delete('/clear', companyAuth, activityController.clearActivities);

module.exports = router;