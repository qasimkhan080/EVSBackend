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
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    country: {
        type: String,
        required: false,  // Removed required
    },
    city: {
        type: String,
        required: false,  // Removed required
    },
    phoneNumber: {
        type: String,
        required: false,  // Removed required
    },
    otp: 
    { type: String ,
        required: true,
    },
    isEmailVerified:
     { type: Boolean, 
        default: false },
    education: [
        {
            levelOfEducation: {
                type: String,
                required: false,  // Removed required
            },
            fieldOfStudy: {
                type: String,
                required: false,  // Removed required
            },
            from: {
                type: Date,
                required: false,  // Removed required
            },
            to: {
                type: Date,
                required: false,  // Removed required
            },
        },
    ],
    languages: [
        {
            language: {
                type: String,
                required: false,  // Removed required
            },
            conversation: {
                type: String,
                required: false,  // Removed required
                enum: ["Professional", "Conventional", "Beginner"],
            },
        },
    ],
    employmentHistory: [
        {
            jobTitle: {
                type: String,
                required: false,  // Removed required
            },
            company: {
                type: String,
                required: false,  // Removed required
            },
            location: {
                type: String,
                required: false,  // Removed required
            },
            currentlyWorking: {
                type: Boolean,
                default: false,
            },
            from: {
                type: Date,
                required: false,  // Removed required
            },
            to: {
                type: Date,
                required: false,  // Removed required
            },
            description: {
                type: String,
                required: false,  // Removed required
            },
        },
    ],
    skills: [
        {
            skillName: {
                type: String,
                required: false,  // Removed required
            }
        },
    ],
    companyRefId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: false,
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
