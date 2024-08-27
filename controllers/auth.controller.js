const Joi = require('@hapi/joi');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const Company = require("../models/company.model")
const generateOtp = require("../shared/generateOtp"); 
const sendOtpEmail = require('../notifications/emailService')

const otpValidation = Joi.object({
    otp: Joi.number().integer().positive().required()
});



exports.signup = async (req, res) => {
    
    const { email, password } = req.body;

    try {
        let company = await Company.findOne({ email });
        if (company) {
            return res.status(206).json({
                meta: {
                    statusCode: 206,
                    status: false,
                    message: `Account already exists for ${email}`
                }
            });
        }
        const otp = generateOtp();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        company = new Company({
            email,
            password: hashedPassword,
            otp
        });
        company = await company.save();

        await sendOtpEmail(email, otp);
        
        const payload = { company: { id: company.id } };
        const token = jwt.sign(payload, config.get('OtpSecret'), { expiresIn: config.get('TokenExpire') });
           res.status(200).json({
            data: {
                token,
                email,
            },
            meta: {
                statusCode: 200,
                status: true,
                message: 'Company registered successfully'
            }
        });

    } catch (error) {
        res.status(500).json({
            meta: {
                statusCode: 500,
                status: false,
                message: 'Internal server error'
            }
        });
    }
};

exports.verifySignupOtp = async (req, res) => {
    const { error } = otpValidation.validate(req.body);
    if (error) {
        return res.status(400).json({
            meta: {
                statusCode: 400,
                status: false,
                message: error.details[0].message
            }
        });
    }
    const { otp } = req.body;
    try {
        let company = await Company.findById(req.company.id, { password: 0, otpCount: 0, deletedAt: 0, updatedAt: 0 });
        if (company) {
            if (otp === company.otp) {
                if (company.status === 'Blocked') {
                    return res.status(206).json({
                        meta: {
                            statusCode: 206,
                            status: false,
                            message: `Your account has been blocked!`
                        }
                    });
                } else if (company.status === 'Deleted') {
                    return res.status(206).json({
                        meta: {
                            statusCode: 206,
                            status: false,
                            message: `Your account has been deleted!`
                        }
                    });
                } else {
                    await Company.findByIdAndUpdate(req.company.id, { $set: { isEmailVerify: true } });
                    company.isEmailVerify = true;
                    const payload = { company: { id: company.id, status: company.status } };
                    const token = jwt.sign(payload, config.get('jwtSecret'), { expiresIn: config.get('TokenExpire') });
                    return res.status(200).json({
                        data: {
                            company,
                            token
                        },
                        meta: {
                            statusCode: 200,
                            status: true,
                            message: `Successfully verified email`
                        }
                    });
                }
            } else {
                return res.status(400).json({
                    meta: {
                        statusCode: 400,
                        status: false,
                        message: "OTP is not valid!"
                    }
                });
            }
        } else {
            return res.status(400).json({
                meta: {
                    statusCode: 400,
                    status: false,
                    message: "Company not found!"
                }
            });
        }
    } catch (error) {
        console.error("Error in verifying company OTP:", error);
        return res.status(500).json({
            meta: {
                statusCode: 500,
                status: false,
                message: "Internal Server Error!"
            }
        });
    }
};

exports.registerCompany = async (req, res) => {
    const { firstName, secondName, companyName, companySize, industry, companyWebsite, phoneNumber, heardAboutUs } = req.body;

    const updateFields = {};

    if (firstName) updateFields.firstName = firstName;
    if (secondName) updateFields.lastName = secondName;
    if (companyName) updateFields.companyName = companyName;
    if (companySize) updateFields.companySize = companySize;
    if (industry) updateFields.industry = industry;
    if (companyWebsite) updateFields.companyWebsite = companyWebsite;
    if (phoneNumber) updateFields.phoneNumber = phoneNumber;
    if (heardAboutUs) updateFields.heardAboutUs = heardAboutUs;

    try {
        let company = await Company.findByIdAndUpdate(
            req.company.id,
            {
                $set: updateFields
            },
            { new: true }
        );

        res.status(200).json({
            data: {
                company: company
            },
            meta: { statusCode: 200, status: true, message: 'Successfully Updated!' }
        });
    } catch (error) {
        res.status(500).json({
            meta: {
                statusCode: 500,
                status: false,
                message: 'Internal server error'
            }
        });
    }
};


exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        let company = await Company.findOne({ email }, { otpCount: 0, deletedAt: 0, updatedAt: 0 });

        if (!company) {
            return res.status(404).json({
                meta: {
                    statusCode: 404,
                    status: false,
                    message: "company not found",
                },
            });
        }

        const isMatch = await bcrypt.compare(password, company.password);

        if (!isMatch) {
            return res.status(400).json({
                meta: { statusCode: 400, status: false, message: "Invalid credentials", },
            });
        }
        const data = {
            _id: company._id,
            email: company.email,
            companyName: company.companyName,
            status: company.status,
           companySize:company.companySize,
            phoneNumber:  company.phoneNumber,
            firstName:company.firstName,
            lastName:company.lastName,
            heardAboutUs:company.heardAboutUs,
            companyWebsite:company.companyWebsite
        }
        const payload = { store: { id: company.id, status: company['status'] } }
        let token = await jwt.sign(payload, config.get('jwtSecret'), { expiresIn: config.get('TokenExpire') })
        res.status(200).json({ meta: { statusCode: 200, status: true, message: "Login successful", }, data: { token: token, company: data }, });
    } catch (error) {
        console.error("Error during login:", error); res.status(500).json({
            meta: { statusCode: 500, status: false, message: "Server error", },
        });
    }
};