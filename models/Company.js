const { type } = require("@hapi/joi/lib/extend");
const { string } = require("joi");
const mongoose = require("mongoose");
const companySchema =mongoose.Schema({
    email: {
        type: String,
        required:true
    },
    password: {
        type:String,
        required:true
    },
    otp: {
        type:Number,
        default:0
    },
    
    isEmailVerify:{
        type: Boolean,
        default: false
    },
    otpCount: {
        type: Number,
        default:0
    },
    createdAt:{
        type: Date,
        default: Date.now
    },
    updatedAt:{
        type: Date,
        default: Date.now
    },
    firstName: {
        type: String,
    },
    lastName: {
        type:String,
    },
    companyName: {
        type:String
    },
    companySize: {
        type:String
    },
    industry: {
        type:String
    },
   companyWebsite: {
    type:String
   },
   phoneNumber:{
   type:String
   },
   heardAboutUs:{
    type:String,
   },
    status: {
    type:String,
    default:"Active"
    }
    

})
module.exports = mongoose.model('Company',companySchema)