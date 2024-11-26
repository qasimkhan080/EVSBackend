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
exports.verifyEmployeeOtp = async (req, res) => {
  const { otp, email } = req.body;  

  try {
      let employee = await Employee.findOne({ email: email });

      if (employee) {
          if (otp === employee.otp) {
              await Employee.findByIdAndUpdate(employee.id, { $set: { isEmailVerified: true } });

              return res.status(200).json({
                  data: { employee },
                  meta: {
                      statusCode: 200,
                      status: true,
                      message: `Successfully verified email`
                  }
              });
          } else {
              return res.status(400).json({
                  meta: {
                      statusCode: 400,
                      status: false,
                      message: "OTP is not valid!"
                  }
              });
          }
      } else {
          return res.status(400).json({
              meta: {
                  statusCode: 400,
                  status: false,
                  message: "Employee not found!"
              }
          });
      }
  } catch (error) {
      console.error("Error in verifying employee OTP:", error);
      return res.status(500).json({
          meta: {
              statusCode: 500,
              status: false,
              message: "Internal Server Error!"
          }
      });
  }
};


 
exports.userSignup = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  try {
     if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        meta: {
          statusCode: 400,
          status: false,
          message: 'All fields (firstName, lastName, email, password) are required.',
        },
      });
    }

     const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        meta: {
          statusCode: 409,
          status: false,
          message: 'Email already exists. Please login instead.',
        },
      });
    }

     const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

     const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    res.status(201).json({
      meta: {
        statusCode: 201,
        status: true,
        message: 'Signup successful!',
      },
      data: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({
      meta: {
        statusCode: 500,
        status: false,
        message: 'Server error during signup.',
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
  
  
  