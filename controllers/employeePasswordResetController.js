const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const config = require("config");
const Employee = require("../models/employee.model");
const sendOtpEmail = require("../notifications/emailService");

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        // Validate email
        if (!email || email.length > 40) {
            return res.status(400).json({
                meta: {
                    statusCode: 400,
                    status: false,
                    message: "Email must not exceed 40 characters.",
                },
            });
        }
        
        // Find the employee
        const employee = await Employee.findOne({ email });
        if (!employee) {
            return res.status(404).json({
                meta: {
                    statusCode: 404,
                    status: false,
                    message: "Employee not found.",
                },
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = bcrypt.hashSync(resetToken, 10);

        // Save token and expiry to employee document
        employee.resetPasswordToken = hashedToken;
        employee.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
        await employee.save();

        // Create reset link and send email
        const resetLink = `${config.get("frontendBaseUrl")}/employee/reset-password/${resetToken}`;
        await sendOtpEmail(employee.email, `Click here to reset your password: ${resetLink}`);

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
    const { newPassword } = req.body;

    try {
        // Find employee with non-expired reset token
        const employee = await Employee.findOne({ resetPasswordExpires: { $gt: Date.now() } });

        if (!employee || !bcrypt.compareSync(token, employee.resetPasswordToken)) {
            return res.status(400).json({
                meta: {
                    statusCode: 400,
                    status: false,
                    message: "Invalid or expired reset token.",
                },
            });
        }
        
        // Validate password
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

        // Update password and clear reset token fields
        employee.password = bcrypt.hashSync(newPassword, 10);
        employee.resetPasswordToken = undefined;
        employee.resetPasswordExpires = undefined;
        await employee.save();

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