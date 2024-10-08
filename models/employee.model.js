const mongoose = require("mongoose");

const employeeSchema = mongoose.Schema({
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    country: {
        type: String,
        required: true,
    },
    city: {
        type: String,
        required: true,
    },
    phoneNumber: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    education: [
        {
            levelOfEducation: {
                type: String,
                required: true,
            },
            fieldOfStudy: {
                type: String,
                required: true,
            },
            from: {
                type: Date,
                required: true,
            },
            to: {
                type: Date,
            },
        },
    ],
    languages: [
        {
            language: {
                type: String,
                required: true,
            },
            conversation: {
                type: String,
                required: true,
                enum: ["Professional", "Conventional", "Beginner"], 
            },
        },
    ],
    employmentHistory: [
        {
            jobTitle: {
                type: String,
                required: true,
            },
            company: {
                type: String,
                required: true,
            },
            location: {
                type: String,
                required: true,
            },
            currentlyWorking: {
                type: Boolean,
                default: false,
            },
            from: {
                type: Date,
                required: true,
            },
            to: {
                type: Date,
            },
            description: {
                type: String,
            },
        },
    ],
    skills: [
        {
            skillName: {
                type: String,
                required: true,
            }
        },
    ],
    companyRefId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Employee', employeeSchema);
