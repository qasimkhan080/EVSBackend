const Activity = require('../models/activity.model');
const Company = require('../models/company.model');

exports.createActivity = async (activityData) => {
  try {
    const activity = new Activity(activityData);
    await activity.save();
    return activity;
  } catch (error) {
    console.error('Error creating activity:', error);
    throw error;
  }
};

exports.getRecentActivities = async (req, res) => {
  try {
    const companyId = req.company.id;

    const companyExists = await Company.findById(companyId);
    if (!companyExists) {
      return res.status(404).json({
        meta: {
          statusCode: 404,
          status: false,
          message: "Company not found"
        }
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalActivities = await Activity.countDocuments({ companyId });
    const totalPages = Math.ceil(totalActivities / limit);

    const activities = await Activity.find({ companyId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const formattedActivities = activities.map(activity => {
      const relativeTime = getRelativeTime(activity.timestamp);

      return {
        id: activity._id,
        description: activity.description,
        relativeTime: relativeTime,
        timestamp: activity.timestamp,
        action: activity.action,
        entityType: activity.entityType
      };
    });

    return res.status(200).json({
      meta: {
        statusCode: 200,
        status: true,
        message: "Recent activities fetched successfully"
      },
      data: {
        activities: formattedActivities,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: totalActivities,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error("Error fetching recent activities:", error);
    return res.status(500).json({
      meta: {
        statusCode: 500,
        status: false,
        message: "Internal server error"
      }
    });
  }
};

exports.clearActivities = async (req, res) => {
  try {
    const companyId = req.company.id;

    const result = await Activity.deleteMany({ companyId });

    return res.status(200).json({
      meta: {
        statusCode: 200,
        status: true,
        message: `${result.deletedCount} activities cleared successfully`
      }
    });
  } catch (error) {
    console.error("Error clearing activities:", error);
    return res.status(500).json({
      meta: {
        statusCode: 500,
        status: false,
        message: "Internal server error"
      }
    });
  }
};

function getRelativeTime(timestamp) {
  const now = new Date();
  const activityTime = new Date(timestamp);
  const diffInSeconds = Math.floor((now - activityTime) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds} sec ago`;
  } else if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)} min ago`;
  } else if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)} hr ago`;
  } else {
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  }
}
