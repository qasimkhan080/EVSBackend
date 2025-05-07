const mongoose = require("mongoose");
const documentSchema = new mongoose.Schema({
    type: { 
        type: String, 
        enum: ['banner', 'profilepic', 'resume', 'education', 'experienceletter', 'certificate'], 
        required: true 
    },
    url: { type: String, required: true },
    name: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
    s3Key: { type: String, required: true },
    uniqueId: { type: String }
});
const employeeSchema = mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false, minlength: 6 },
    about: { type: String, default: "" },
    companyLogo: { type: String, required: false },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    country: { type: String, required: false },
    city: { type: String, required: false },
    phoneNumber: { type: String, required: false },
    otp: { type: String, required: false },
    isEmailVerified: { type: Boolean, default: false },
    education: [
        {
            levelOfEducation: { type: String, required: false },
            fieldOfStudy: { type: String, required: false },
            fromYear: { type: String },
            toYear: { type: String },
        },
    ],
    languages: [
        {
            language: { type: String, required: false },
            conversation: {
                type: String,
                required: false,
                enum: ["Professional", "Conventional", "Beginner"],
            },
        },
    ],
    employmentHistory: [
        {
            jobTitle: { type: String, required: false },
            company: { type: String, required: false },
            location: { type: String, required: false },
            currentlyWorking: { type: Boolean, default: false },
            fromMonth: { type: String },
            fromYear: { type: String },
            toMonth: {
                type: String,
                required: function () {
                    return !this.currentlyWorking;
                },
            },
            toYear: {
                type: String,
                required: function () {
                    return !this.currentlyWorking;
                },
            },
            type: { type: String, enum: ['Full-time', 'Part-time', 'Contract', 'W2'], required: false },
            description: { type: String, required: false },
            verified: { type: Boolean, default: false },
        },
    ],
    skills: [{ skillName: { type: String, required: false } }],
    companyRefId: { type: String, required: false },
    selfEnrolled: { type: Boolean, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    isBlocked: { type: Boolean, default: false },

    verificationRequests: [
        {

            companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
            companyName: { type: String },
            employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
            employeeName: { type: String },
            employeeEmail: { type: String },
            designation: String,
            skills: [{ type: String }],
            description: String,
            from: String,
            to: String,
            status: {
                type: String,
                enum: ['Approved', 'Pending', 'Rejected'],
                default: 'Pending'
            },
            requestedAt: { type: Date, default: Date.now },
        },
    ],

    ratings: [
        {
            rating: Number,
            comment: String,
            selectedOptions: [String],
            date: { type: Date, default: Date.now },
            status: {
                type: String,
                enum: ['Approved', 'Rejected', 'pending'],
            }
        },
    ],
    companyBlocks: [
        {
            companyRefId: { type: String },
            isBlocked: { type: Boolean, default: false },
            comment: { type: String, default: "" },
        },
    ],

    documents: [documentSchema]

});

module.exports = mongoose.model("Employee", employeeSchema);
