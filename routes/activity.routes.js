const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity.controller');
const companyAuth = require('../middlewares/companyAuth');

router.get('/', companyAuth, activityController.getRecentActivities);

router.delete('/clear', companyAuth, activityController.clearActivities);

module.exports = router;