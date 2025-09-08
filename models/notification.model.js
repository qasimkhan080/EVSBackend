const mongoose = require('mongoose');

const notificationSchema = mongoose.Schema({
    type: {
        type: String,
        enum: ['company', 'employee'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    // Reference to company if notification is for a company
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: function() {
            return this.type === 'company';
        }
    },
    // Reference to employee if notification is for an employee
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: function() {
            return this.type === 'employee';
        }
    },
    // Optional reference to related company (for employee notifications)
    relatedCompanyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company'
    },
    // Optional reference to related employee (for company notifications)
    relatedEmployeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },
    // Optional reference to verification request
    requestId: {
        type: mongoose.Schema.Types.ObjectId
    },
    isRead: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Notification', notificationSchema);