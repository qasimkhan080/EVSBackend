const activityController = require('../controllers/activity.controller');

const logActivity = async (companyId, action, description, entityType, entityId, performedBy) => {
  try {
    const activityData = {
      companyId,
      action,
      description,
      entityType,
      entityId,
      performedBy
    };

    await activityController.createActivity(activityData);
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

module.exports = logActivity;