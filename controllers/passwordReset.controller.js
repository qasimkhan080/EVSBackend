const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const config = require("config");
const Company = require("../models/company.model");
const Employee = require("../models/employee.model");
const sendOtpEmail = require("../notifications/emailService");

exports.forgotPassword = async (req, res) => {
    const { email, userType } = req.body;

    try {
        if (!email || email.length > 40) {
            return res.status(400).json({
                meta: {
                    statusCode: 400,
                    status: false,
                    message: "Email must not exceed 40 characters.",
                },
            });
        }

        const Model = userType === 'company' ? Company : Employee;
        const user = await Model.findOne({ email });

        if (!user) {
            return res.status(404).json({
                meta: {
                    statusCode: 404,
                    status: false,
                    message: "User not found.",
                },
            });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = bcrypt.hashSync(resetToken, 10);

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
        await user.save();

        const resetPath = userType === 'company'
            ? '/company/reset-password'
            : '/employee/reset-password';

        const resetLink = `${config.get("frontendBaseUrl")}${resetPath}/${resetToken}`;

        await sendOtpEmail(user.email, `Click here to reset your password: ${resetLink}`);

        return res.status(200).json({
            meta: {
                statusCode: 200,
                status: true,
                message: "Password reset email sent successfully.",
            },
        });

    } catch (error) {
        console.error("Error sending reset email:", error);
        return res.status(500).json({
            meta: {
                statusCode: 500,
                status: false,
                message: "Internal server error.",
            },
        });
    }
};

exports.resetPassword = async (req, res) => {
    const { token } = req.params;
    const { newPassword, userType } = req.body;

    try {
        const Model = userType === 'company' ? Company : Employee;

        const user = await Model.findOne({
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user || !bcrypt.compareSync(token, user.resetPasswordToken)) {
            return res.status(400).json({
                meta: {
                    statusCode: 400,
                    status: false,
                    message: "Invalid or expired reset token.",
                },
            });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                meta: {
                    statusCode: 400,
                    status: false,
                    message: "Password must be at least 8 characters, including uppercase, lowercase, number, and special character."
                },
            });
        }

        user.password = bcrypt.hashSync(newPassword, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        return res.status(200).json({
            meta: {
                statusCode: 200,
                status: true,
                message: "Password has been reset successfully!",
            },
        });

    } catch (error) {
        console.error("Password reset error:", error);
        return res.status(500).json({
            meta: {
                statusCode: 500,
                status: false,
                message: "Server error.",
            },
        });
    }
};
