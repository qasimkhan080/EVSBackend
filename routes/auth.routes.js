const express = require("express");
const router = express.Router();
const otpStoreTimeVerify = require("../middlewares/otpStoreTimeVerify");
const companyAuth = require("../middlewares/companyAuth");
const authController = require("../controllers/auth.controller");
const resendOtpController = require("../controllers/resendOtp.controller")
const passwordResetController = require("../controllers/passwordReset.controller");
const upload = require("../middlewares/upload");


router.post("/send-otp", upload.single("companyLogo"), authController.sendOtp);
router.post('/verify-signup-company-otp', otpStoreTimeVerify, authController.verifySignupOtp);
router.put("/register-company", companyAuth, authController.registerCompany);
router.post("/resend-otp", resendOtpController.resendOtp);
// router.put("/signup-final-step", companyAuth, authController.signupFinalStep);
router.post("/login", authController.login);
router.get("/company-data/:companyRefId", authController.getCompanyByRefId);
router.delete("/:companyId", authController.deleteCompany);
router.get("/verification-requests/:companyRefId", authController.getVerificationRequestsForCompany);
router.patch("/update-verification-status/:employeeId/:requestId", authController.updateVerificationStatus);
router.post("/forgot-password", passwordResetController.forgotPassword);
router.post("/reset-password/:token", passwordResetController.resetPassword);
router.get("/verification-stats/:companyRefId", authController.getVerificationStats);

// Public Routes
// router.get("/companies", authController.getAllCompanies);





module.exports = router;
