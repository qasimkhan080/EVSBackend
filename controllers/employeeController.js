const Employee = require('../models/employee.model')
const Company = require('../models/company.model')


exports.addEmployee = async (req, res) => {
  const {
    firstName,
    lastName,
    country,
    city,
    phoneNumber,
    email,
    education,
    languages,
    employmentHistory,
    skills,
    companyRefId,
  } = req.body;

  try {
   
    if (!firstName || !lastName || !email || !companyRefId) {
      return res.status(400).json({
        meta: {
          statusCode: 400,
          status: false,
          message: 'Required fields are missing.',
        },
      });
    }

    // Check if the company exists
    const companyExists = await Company.findById(companyRefId);
    if (!companyExists) {
      return res.status(404).json({
        meta: {
          statusCode: 404,
          status: false,
          message: 'Company not found.',
        },
      });
    }

    
    const newEmployee = new Employee({
      firstName,
      lastName,
      country,
      city,
      phoneNumber,
      email,
      education,
      languages,
      employmentHistory,
      skills, 
      companyRefId,
    });

    await newEmployee.save();

    res.status(201).json({
      meta: {
        statusCode: 201,
        status: true,
        message: 'Employee added successfully.',
      },
      data: newEmployee,
    });
  } catch (error) {
    console.error('Error adding employee:', error);
    res.status(500).json({
      meta: {
        statusCode: 500,
        status: false,
        message: 'Server error.',
      },
    });
  }
};



exports.getEmployeesByCompany = async (req, res) => {
  debugger
    const { companyRefId } = req.params;
  
    try {
      const employees = await Employee.find({ companyRefId });
  
      if (!employees || employees.length === 0) {
        return res.status(404).json({
          meta: {
            statusCode: 404,
            status: false,
            message: "No employees found for the provided company reference ID."
          },
          data: []
        });
      }
  
      res.status(200).json({
        meta: {
          statusCode: 200,
          status: true,
          message: "Employees retrieved successfully."
        },
        data: employees
      });
  
    } catch (error) {
      console.error("Error retrieving employees:", error);
      res.status(500).json({
        meta: {
          statusCode: 500,
          status: false,
          message: "Server error. Could not retrieve employees."
        }
      });
    }
  };

  exports.getCompanies = async (req, res) => {
    try {
      const companies = await Company.aggregate([
        {
          $match: {
            companyName: { $exists: true, $ne: "" } 
          }
        }
      ]);
  
      if (!companies || companies.length === 0) {
        return res.status(404).json({
          meta: {
            statusCode: 404,
            status: false,
            message: "No companies found with a valid company name."
          },
          data: []
        });
      }
  
      res.status(200).json({
        meta: {
          statusCode: 200,
          status: true,
          message: "Companies retrieved successfully."
        },
        data: companies 
      });
  
    } catch (error) {
      console.error("Error retrieving companies:", error);
      res.status(500).json({
        meta: {
          statusCode: 500,
          status: false,
          message: "Server error. Could not retrieve companies."
        }
      });
    }
  };


  exports.getCompanyById = async (req, res) => {
    const  companyId  = req.params.id;
  
    try {
      const company = await Company.findById(companyId);
  
      if (!company) {
        return res.status(404).json({
          meta: {
            statusCode: 404,
            status: false,
            message: "Company not found."
          },
          data: null
        });
      }
  
      res.status(200).json({
        meta: {
          statusCode: 200,
          status: true,
          message: "Company retrieved successfully."
        },
        data: company
      });
    } catch (error) {
      console.error("Error retrieving company:", error);
      res.status(500).json({
        meta: {
          statusCode: 500,
          status: false,
          message: "Server error. Could not retrieve company."
        }
      });
    }
  };
  
  
  