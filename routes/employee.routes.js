const express = require("express");
const router = express.Router();
const employeeController = require('../controllers/employeeController')
const companyAuth = require("../middlewares/companyAuth");


router.post("/add", companyAuth, employeeController.addEmployee);
router.get("/companies", employeeController.getCompanies);
router.get("/com/:companyRefId", employeeController.getEmployeesByCompany);
router.get("/:id", employeeController.getCompanyById);
router.get("/emp/:id", employeeController.getEmployeeById);
router.delete("/:employeeId", employeeController.deleteEmployee);
router.put('/verify/:employeeId/:employmentIndex', employeeController.verifyEmployment);
router.put('/update/:employeeId', employeeController.updateEmployee);
router.post("/verifyotp", employeeController.verifyEmployeeOtp);
router.post("/login", employeeController.loginEmployee);
router.post("/:employeeId/verify/:companyId", employeeController.sendVerificationRequest);
router.get("/:employeeId/verification-requests/:requestId?", employeeController.getEmployeeVerificationRequests);
router.patch("/update-verification-status/:employeeId/:requestId", employeeController.updateVerificationStatus);
router.put("/block/:employeeId", employeeController.blockEmployee);


module.exports = router;