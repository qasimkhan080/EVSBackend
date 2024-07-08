
const jwt = require('jsonwebtoken');
const config = require('config');
const e = require('cors');

module.exports = function (req, res, next) {
    const otpToken = req.header('x-auth-otp'); // Assuming the token is passed in a custom header 'x-auth-otp'
    console.log("no toekn", otpToken)
    if (!otpToken) {
        console.log("no toekn")
        return res.status(401).json({ meta: { statusCode: 401, status: false, message: `No OTP Token provided`} });
    }

    try {
        const decoded = jwt.verify(otpToken, config.get('OtpSecret'));
        req.company = decoded.company; // Assuming the token payload has a 'company' property
        next();
    } catch (error) {
        console.log(error);
        return res.status(401).json({ meta: { statusCode: 401, status: false, message: `Invalid OTP Token`} });
    }
};
