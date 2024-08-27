// controller/resendOtp.js

const Company = require('../models/company.model'); // Replace with your actual model path
const sendOtpEmail  = require('../notifications/emailService'); // Replace with your actual utils path
const generateOtp = require("../shared/generateOtp"); 
const config = require('config');
const jwt = require('jsonwebtoken');

exports.resendOtp = async (req, res) => {
    const { email } = req.body; 

    try {
        let company = await Company.findOne({ email });
        if (!company) {
            return res.status(404).json({
                meta: {
                    statusCode: 404,
                    status: false,
                    message: `No account found for ${email}`
                }
            });
        }

        const newOtp = generateOtp();

        company.otp = newOtp;
        await company.save();

        await sendOtpEmail(email, newOtp);

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
                message: 'OTP resent successfully'
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            meta: {
                statusCode: 500,
                status: false,
                message: 'Internal server error'
            }
        });
    }
};
