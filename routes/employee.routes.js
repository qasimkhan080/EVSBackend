const express = require("express");
const router = express.Router();
const employeeController = require('../controllers/employeeController')
const companyAuth = require("../middlewares/companyAuth");


router.post("/add", companyAuth, employeeController.addEmployee);
router.get("/employees/:companyRefId", companyAuth, employeeController.getEmployeesByCompany)

module.exports = router;
