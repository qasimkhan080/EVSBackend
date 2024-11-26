const express = require("express");
const router = express.Router();
const employeeController = require('../controllers/employeeController')
const companyAuth = require("../middlewares/companyAuth");
const authController = require("../controllers/auth.controller");


router.post("/add", companyAuth, employeeController.addEmployee);
router.post("/Signup",  authController.userSignup);
router.post("/verifyotp",  employeeController.verifyEmployeeOtp);

router.get("/companies", employeeController.getCompanies);
router.get("/com/:companyRefId", companyAuth, employeeController.getEmployeesByCompany);
router.get("/:id", employeeController.getCompanyById)
router.post("/login", authController.loginEmp);

module.exports = router;

