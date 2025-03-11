const mongoose = require("mongoose");
const companySchema = mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true

    },
    password: {
        type: String,
        required: true
    },
    otp: {
        type: Number,
        default: 0
    },

    isEmailVerify: {
        type: Boolean,
        default: false
    },
    otpCount: {
        type: Number,
        default: 1
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    firstName: {
        type: String,
    },
    secondName: {
        type: String,
    },
    companyName: {
        type: String,
    },
    companyLogo: {
        type: String,
        required: true
    },
    companySize: {
        type: String
    },
    industry: {
        type: String
    },
    companyWebsite: {
        type: String
    },
    phoneNumber: {
        type: String
    },
    heardAboutUs: {
        type: String,
    },
    status: {
        type: String,
        default: "Active"
    },
    companyRefId: {
        type: String,
        required: true,
        unique: true
    },
    resetPasswordToken: {
        type: String,
        default: null
    },
    resetPasswordExpires: {
        type: Date,
        default: null
    },
    receivedRequests: [
        {

            employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
            employeeName: { type: String },
            employeeEmail: { type: String },
            companyName: { type: String },
            designation: String,
            skills: String,
            description: String,
            from: Date,
            to: Date,
            status: { type: String, default: "Pending" },
            requestedAt: { type: Date, default: Date.now },
        },
    ],

})
module.exports = mongoose.model('Company', companySchema);
