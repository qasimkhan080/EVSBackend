const Joi = require('@hapi/joi');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const Company = require("../models/company.model")
const generateOtp = require("../shared/generateOtp");
const sendOtpEmail = require('../notifications/emailService');
const employeeModel = require('../models/employee.model');

const otpValidation = Joi.object({
    otp: Joi.number().integer().positive().required()
});


exports.signup = async (req, res) => {
    const { email, password } = req.body;

    try {
        let company = await Company.findOne({ email });
        if (company) {
            return res.status(409).json({
                meta: {
                    statusCode: 409,
                    status: false,
                    message: `Account already exists for ${email}`
                }
            });
        }

        const otp = generateOtp();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const emailPrefix = email.substring(0, 6);
        let companyRefId = `${emailPrefix}-${generateUniqueId()}`;

        company = new Company({
            email,
            password: hashedPassword,
            otp,
            companyRefId,
        });

        company = await company.save();

        await sendOtpEmail(email, otp);

        const payload = { company: { id: company.id } };
        const token = jwt.sign(payload, config.get('OtpSecret'), { expiresIn: config.get('TokenExpire') });

        return res.status(201).json({
            data: {
                token,
            },
            meta: {
                statusCode: 201,
                status: true,
                message: 'Company registered successfully'
            }
        });

    } catch (error) {
        console.error('Error during signup:', error.message);
        return res.status(500).json({
            meta: {
                statusCode: 500,
                status: false,
                message: `Internal server error: ${error.message}`
            }
        });
    }
};


const generateUniqueId = () => {
    const timestamp = Date.now();
    const randomNumber = Math.floor(Math.random() * 10000);
    return `${timestamp}${randomNumber}`;
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
    if (secondName) updateFields.secondName = secondName;
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
        const payload = { company: { id: company.id } };
        res.status(200).json({
            data: {
                company: company,
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


exports.getCompanyById = async (req, res) => {
    const { companyId } = req.params;

    try {
        const company = await Company.findById(companyId);

        if (!company) {
            return res.status(404).json({
                meta: {
                    statusCode: 404,
                    status: false,
                    message: "Company not found",
                },
            });
        }

        res.status(200).json({
            data: company,
            meta: {
                statusCode: 200,
                status: true,
                message: "Company details fetched successfully",
            },
        });
    } catch (error) {
        console.error("Error fetching company details:", error.message);
        res.status(500).json({
            meta: {
                statusCode: 500,
                status: false,
                message: "Internal server error",
            },
        });
    }
};


exports.deleteCompany = async (req, res) => {
    const { companyId } = req.params;

    try {
        const deletedCompany = await Company.findByIdAndDelete(companyId);

        if (!deletedCompany) {
            return res.status(404).json({
                meta: {
                    statusCode: 404,
                    status: false,
                    message: "Company not found",
                },
            });
        }

        res.status(200).json({
            meta: {
                statusCode: 200,
                status: true,
                message: "Company deleted successfully",
            },
        });
    } catch (error) {
        console.error("Error deleting company:", error.message);
        res.status(500).json({
            meta: {
                statusCode: 500,
                status: false,
                message: "Internal server error",
            },
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
            companySize: company.companySize,
            phoneNumber: company.phoneNumber,
            firstName: company.firstName,
            secondName: company.secondName,
            heardAboutUs: company.heardAboutUs,
            companyWebsite: company.companyWebsite,
            companyRefId: company.companyRefId,

        }
        const payload = { store: { id: company.id, status: company['status'] } }
        let token = jwt.sign(payload, config.get('jwtSecret'), { expiresIn: config.get('TokenExpire') })
        res.status(200).json({ meta: { statusCode: 200, status: true, message: "Login successful", }, data: { token: token, company: data }, });
    } catch (error) {
        console.error("Error during login:", error); res.status(500).json({
            meta: { statusCode: 500, status: false, message: "Server error", },
        });
    }
};


exports.getVerificationRequestsForCompany = async (req, res) => {
    const { companyId } = req.params;

    try {
        const company = await Company.findOne({ companyRefId: companyId });

        if (!company) {
            return res.status(404).json({
                meta: {
                    statusCode: 404,
                    status: false,
                    message: "Company not found or has no received requests.",
                },
            });
        }

        res.status(200).json({
            meta: {
                statusCode: 200,
                status: true,
                message: "Verification requests retrieved successfully.",
            },
            data: company.receivedRequests || [],
        });
    } catch (error) {
        console.error("Error fetching verification requests for company:", error);
        res.status(500).json({
            meta: {
                statusCode: 500,
                status: false,
                message: "Server error. Could not fetch verification requests.",
            },
        });
    }
};


exports.updateVerificationStatus = async (req, res) => {
    try {
        const { employeeId, requestId } = req.params;
        const { status } = req.body;

        if (!["Approved", "Rejected"].includes(status)) {
            return res.status(400).json({
                meta: { statusCode: 400, status: false, message: "Invalid status. Allowed: Approved, Rejected" },
            });
        }

        const employee = await employeeModel.findById(employeeId);
        if (!employee) {
            return res.status(404).json({
                meta: { statusCode: 404, status: false, message: "Employee not found." },
            });
        }

        const requestIndex = employee.verificationRequests.findIndex(req => req._id.toString() === requestId);
        if (requestIndex === -1) {
            return res.status(404).json({
                meta: { statusCode: 404, status: false, message: "Verification request not found." },
            });
        }

        employee.verificationRequests[requestIndex].status = status;
        await employee.save();

        return res.status(200).json({
            meta: { statusCode: 200, status: true, message: `Request ${status} successfully.` },
        });
    } catch (error) {
        return res.status(500).json({
            meta: { statusCode: 500, status: false, message: "Server error. Could not update status." },
        });
    }
};

