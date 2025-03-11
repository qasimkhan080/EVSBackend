const jwt = require("jsonwebtoken");
const sendOtpEmail = require("../notifications/emailService");
const generateOtp = require("../shared/generateOtp");
const config = require("config");

exports.resendOtp = async (req, res) => {
    const authToken = req.header("x-auth-token");

    if (!authToken) {
        return res.status(400).json({
            meta: { statusCode: 400, status: false, message: "AuthToken is required for resending OTP." }
        });
    }

    try {
        const decoded = jwt.verify(authToken, config.get("AuthSecret"));
        const { email, password, companyLogo, otpCount = 1 } = decoded;

        if (!email || !password) {
            return res.status(401).json({
                meta: { statusCode: 401, status: false, message: "Invalid or expired AuthToken!" }
            });
        }

        if (otpCount >= 5) {
            return res.status(429).json({
                meta: { statusCode: 429, status: false, message: "OTP resend limit reached. Please restart the process." }
            });
        }

        const newOtp = generateOtp();
        const newOtpToken = jwt.sign(
            { email, otp: newOtp, password, companyLogo, otpCount: otpCount + 1 },
            config.get("OtpSecret"),
            { expiresIn: "2m" }
        );

        await sendOtpEmail(email, newOtp);

        return res.status(200).json({
            meta: { statusCode: 200, status: true, message: `New OTP sent successfully. Remaining attempts: ${5 - (otpCount + 1)}` },
            data: { otpToken: newOtpToken }
        });

    } catch (error) {
        console.error("Error resending OTP:", error);
        return res.status(500).json({ meta: { statusCode: 500, status: false, message: "Internal server error" } });
    }
};
