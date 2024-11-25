const express = require("express");
const router = express.Router();
const employeeController = require('../controllers/employeeController')
const companyAuth = require("../middlewares/companyAuth");
const authController = require("../controllers/auth.controller");


router.post("/add", companyAuth, employeeController.addEmployee);
router.post("/Signup",  authController.userSignup);

router.get("/companies", employeeController.getCompanies);
router.get("/com/:companyRefId", companyAuth, employeeController.getEmployeesByCompany);
router.get("/:id", employeeController.getCompanyById)

module.exports = router;

