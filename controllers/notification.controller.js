const Notification = require('../models/notification.model');
const mongoose = require('mongoose');

// Get notifications for a company
exports.getCompanyNotifications = async (req, res) => {
  const { companyId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  try {
    // Validate companyId
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        meta: {
          statusCode: 400,
          status: false,
          message: "Invalid company ID format."
        }
      });
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Find notifications for this company
    const notifications = await Notification.find({ 
      type: 'company', 
      companyId: companyId 
    })
    .sort({ createdAt: -1 }) // Sort by newest first
    .skip(skip)
    .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Notification.countDocuments({ 
      type: 'company', 
      companyId: companyId 
    });

    res.status(200).json({
      meta: {
        statusCode: 200,
        status: true,
        message: "Notifications retrieved successfully."
      },
      data: {
        notifications,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error("Error retrieving company notifications:", error);
    res.status(500).json({
      meta: {
        statusCode: 500,
        status: false,
        message: "Server error."
      }
    });
  }
};

// Get notifications for an employee
exports.getEmployeeNotifications = async (req, res) => {
  const { employeeId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  try {
    // Validate employeeId
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({
        meta: {
          statusCode: 400,
          status: false,
          message: "Invalid employee ID format."
        }
      });
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Find notifications for this employee
    const notifications = await Notification.find({ 
      type: 'employee', 
      employeeId: employeeId 
    })
    .sort({ createdAt: -1 }) // Sort by newest first
    .skip(skip)
    .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Notification.countDocuments({ 
      type: 'employee', 
      employeeId: employeeId 
    });

    res.status(200).json({
      meta: {
        statusCode: 200,
        status: true,
        message: "Notifications retrieved successfully."
      },
      data: {
        notifications,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error("Error retrieving employee notifications:", error);
    res.status(500).json({
      meta: {
        statusCode: 500,
        status: false,
        message: "Server error."
      }
    });
  }
};

// Mark notification as read
exports.markNotificationAsRead = async (req, res) => {
  const { notificationId } = req.params;

  try {
    // Validate notificationId
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({
        meta: {
          statusCode: 400,
          status: false,
          message: "Invalid notification ID format."
        }
      });
    }

    // Find and update the notification
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        meta: {
          statusCode: 404,
          status: false,
          message: "Notification not found."
        }
      });
    }

    res.status(200).json({
      meta: {
        statusCode: 200,
        status: true,
        message: "Notification marked as read."
      },
      data: notification
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({
      meta: {
        statusCode: 500,
        status: false,
        message: "Server error."
      }
    });
  }
};