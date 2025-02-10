const express = require("express");
const router = express.Router();
const otpStoreTimeVerify = require("../middlewares/otpStoreTimeVerify");
const companyAuth = require("../middlewares/companyAuth");
const authController = require("../controllers/auth.controller");
const resendOtpController = require("../controllers/resendOtp.controller")

router.post("/signup", authController.signup);
router.post('/verify-signup-company-otp', otpStoreTimeVerify, authController.verifySignupOtp);
router.put("/register-company", companyAuth, authController.registerCompany);
router.post("/resend-otp", resendOtpController.resendOtp);
// router.put("/signup-final-step", companyAuth, authController.signupFinalStep);
router.post("/login", authController.login);
router.get("/:companyId", authController.getCompanyById);
router.delete("/:companyId", authController.deleteCompany);
router.get("/verification-requests/:companyId", authController.getVerificationRequestsForCompany);
router.patch("/update-verification-status/:employeeId/:requestId", authController.updateVerificationStatus);





module.exports = router;
