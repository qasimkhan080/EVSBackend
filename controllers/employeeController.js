const Employee = require('../models/employee.model')
const Company = require('../models/company.model')
const bcrypt = require("bcrypt");
const sendOtpEmail = require('../notifications/emailService')
const generateOtp = require("../shared/generateOtp");
const config = require("config");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");


exports.addEmployee = async (req, res) => {
  const {
    firstName,
    lastName,
    country,
    city,
    phoneNumber,
    email,
    password,
    about,
    education,
    languages,
    employmentHistory,
    skills,
    companyRefId,
    selfEnrolled,
  } = req.body;

  try {
    if (!firstName || !lastName || !email || typeof selfEnrolled !== "boolean") {
      return res.status(400).json({
        meta: {
          statusCode: 400,
          status: false,
          message: "Missing required fields: firstName, lastName, email, or selfEnrolled.",
        },
      });
    }

    // Check if employee already exists
    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return res.status(409).json({
        meta: {
          statusCode: 409,
          status: false,
          message: `An account with email ${email} already exists.`,
        },
      });
    }

    // Self-enrolled employee logic
    if (selfEnrolled) {
      if (!password) {
        return res.status(400).json({
          meta: {
            statusCode: 400,
            status: false,
            message: "Password is required for self-registration.",
          },
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const otp = generateOtp();

      // Create employee with OTP and hashed password
      const newEmployee = new Employee({
        firstName,
        lastName,
        country,
        city,
        phoneNumber,
        email,
        password: hashedPassword,
        about,
        otp,
        isEmailVerified: false,
        education: education?.map((edu) => ({
          levelOfEducation: edu.levelOfEducation,
          fieldOfStudy: edu.fieldOfStudy,
          fromYear: edu.fromYear,
          toYear: edu.toYear,
        })),
        languages,
        employmentHistory,
        skills: skills?.map((skill) => ({ skillName: skill.skillName })),
        selfEnrolled: true,
      });

      await newEmployee.save();
      await sendOtpEmail(email, otp);

      return res.status(201).json({
        meta: {
          statusCode: 201,
          status: true,
          message: "Employee registered successfully. OTP sent to the email.",
        },
        data: { id: newEmployee._id, email: newEmployee.email },
      });
    }

    // Company-added employee logic
    if (!selfEnrolled) {
      if (!companyRefId) {
        return res.status(400).json({
          meta: {
            statusCode: 400,
            status: false,
            message: "Company reference ID is required for company-added employees.",
          },
        });
      }

      const company = await Company.findOne({ companyRefId });
      if (!company) {
        return res.status(404).json({
          meta: {
            statusCode: 404,
            status: false,
            message: "Company not found.",
          },
        });
      }
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create employee without OTP    
      const newEmployee = new Employee({
        firstName,
        lastName,
        country,
        city,
        phoneNumber,
        email,
        password: hashedPassword,
        education: education?.map((edu) => ({
          levelOfEducation: edu.levelOfEducation,
          fieldOfStudy: edu.fieldOfStudy,
          fromYear: edu.fromYear,
          toYear: edu.toYear,
        })),
        languages,
        employmentHistory,
        skills: skills?.map((skill) => ({ skillName: skill.skillName })),
        companyRefId,
        selfEnrolled: false,
      });

      await newEmployee.save();

      return res.status(201).json({
        meta: {
          statusCode: 201,
          status: true,
          message: "Employee added successfully by the company.",
        },
        data: newEmployee,
      });
    }

    res.status(400).json({
      meta: {
        statusCode: 400,
        status: false,
        message: "Invalid request. Please specify selfEnrolled as true or false.",
      },
    });
  } catch (error) {
    console.error("Error adding employee:", error.message);
    res.status(500).json({
      meta: {
        statusCode: 500,
        status: false,
        message: "Server error. Could not add employee.",
      },
    });
  }
};


exports.verifyEmployeeOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
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

    if (employee.otp !== otp) {
      return res.status(400).json({
        meta: {
          statusCode: 400,
          status: false,
          message: "Invalid OTP. Please try again.",
        },
      });
    }

    employee.isEmailVerified = true;
    employee.otp = null;
    await employee.save();

    res.status(200).json({
      meta: {
        statusCode: 200,
        status: true,
        message: "OTP verified successfully. Your email is now verified.",
      },
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({
      meta: {
        statusCode: 500,
        status: false,
        message: "Internal server error.",
      },
    });
  }
};


exports.sendVerificationRequest = async (req, res) => {
  const { employeeId, companyId } = req.params;
  const { designation, skills, description, from, to } = req.body;

  try {
    if (!designation || !skills || !description || !from) {
      return res.status(400).json({
        meta: {
          statusCode: 400,
          status: false,
          message: "Missing required fields: designation, skills, description, or from.",
        },
      });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        meta: { statusCode: 404, status: false, message: "Employee not found." },
      });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        meta: { statusCode: 404, status: false, message: "Company not found." },
      });
    }

    const userName = `${employee.firstName} ${employee.lastName}`;
    const userEmail = employee.email;

    const verificationRequest = {
      _id: new mongoose.Types.ObjectId(),
      companyId,
      companyName: company.companyName,
      employeeId,
      employeeName: userName,
      employeeEmail: userEmail,
      designation,
      skills,
      description,
      from,
      to,
      status: "Pending",
      requestedAt: new Date(),
    };

    employee.verificationRequests.push(verificationRequest);
    await employee.save();

    company.receivedRequests.push(verificationRequest);
    await company.save();

    res.status(200).json({
      meta: { statusCode: 200, status: true, message: "Verification request sent successfully." },
    });
  } catch (error) {
    console.error("Error sending verification request:", error);
    res.status(500).json({
      meta: { statusCode: 500, status: false, message: "Server error." },
    });
  }
};


exports.getEmployeeVerificationRequests = async (req, res) => {
  try {
    const { employeeId } = req.params;

    let query;
    if (mongoose.Types.ObjectId.isValid(employeeId)) {
      query = { _id: employeeId };
    } else {
      query = { companyRefId: employeeId };
    }

    const employee = await Employee.findOne(query);

    if (!employee) {
      return res.status(404).json({
        meta: { statusCode: 404, status: false, message: "Employee not found." },
      });
    }

    res.status(200).json({
      meta: { statusCode: 200, status: true, message: "Verification requests fetched successfully." },
      data: employee.verificationRequests || [],
    });
  } catch (error) {
    console.error("Error fetching verification requests:", error);
    res.status(500).json({
      meta: { statusCode: 500, status: false, message: "Server error." },
    });
  }
};


exports.updateVerificationStatus = async (req, res) => {
  try {
    const { employeeId, requestId } = req.params;
    const { status } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        meta: { statusCode: 400, status: false, message: "Invalid status. Allowed: Approved, Rejected" },
      });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        meta: { statusCode: 404, status: false, message: "Employee not found." },
      });
    }

    // Find the verification request by ID
    const request = employee.verificationRequests.find(req => req._id.toString() === requestId);
    if (!request) {
      return res.status(404).json({
        meta: { statusCode: 404, status: false, message: "Verification request not found." },
      });
    }

    request.status = status;
    await employee.save();

    return res.status(200).json({
      meta: { statusCode: 200, status: true, message: `Request ${status} successfully.` },
    });
  } catch (error) {
    console.error("Error updating verification status:", error);
    return res.status(500).json({
      meta: { statusCode: 500, status: false, message: "Server error. Could not update status." },
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
  const { companyRefId } = req.params;

  try {
    const employees = await Employee.find({ companyRefId });

    if (!employees || employees.length === 0) {
      return res.status(404).json({
        meta: {
          statusCode: 404,
          status: false,
          message: `No employees found for company reference ID '${companyRefId}'.`,
        },
        data: [],
      });
    }

    const blockedEmployees = employees.filter(emp => emp.isBlocked === true);
    const unblockedEmployees = employees.filter(emp => emp.isBlocked === false);

    res.status(200).json({
      meta: {
        statusCode: 200,
        status: true,
        message: `Employees retrieved successfully for company '${companyRefId}'.`,
      },
      data: {
        blocked: blockedEmployees,
        unblocked: unblockedEmployees
      },
    });

  } catch (error) {
    console.error("Error retrieving employees:", error);
    res.status(500).json({
      meta: {
        statusCode: 500,
        status: false,
        message: "Server error. Could not retrieve employees.",
      },
    });
  }
};


exports.getCompanies = async (req, res) => {
  const { companyRefId } = req.query;

  try {
    console.log("Fetching companies...");

    const query = companyRefId ? { companyRefId: companyRefId } : {};

    const companies = await Company.find(query);
    console.log("Companies retrieved from database:", companies);

    if (!companies || companies.length === 0) {
      return res.status(404).json({
        meta: {
          statusCode: 404,
          status: false,
          message: "No companies found with the given companyRefId."
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


exports.blockEmployee = async (req, res) => {
  const { employeeId } = req.params;
  const { isBlocked } = req.body;

  try {
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        meta: { statusCode: 404, status: false, message: "Employee not found." }
      });
    }

    employee.isBlocked = isBlocked;
    await employee.save();

    res.status(200).json({
      meta: { statusCode: 200, status: true, message: `Employee ${isBlocked ? "blocked" : "unblocked"} successfully.` }
    });
  } catch (error) {
    console.error("Error blocking employee:", error);
    res.status(500).json({
      meta: { statusCode: 500, status: false, message: "Server error. Could not update block status." }
    });
  }
};


exports.getCompanyById = async (req, res) => {
  const companyId = req.params.id;

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


exports.getEmployeeById = async (req, res) => {
  const { id } = req.params;

  try {
    const employee = await Employee.findById(id);

    if (!employee) {
      return res.status(404).json({
        meta: {
          statusCode: 404,
          status: false,
          message: "Employee not found with the given ID."
        },
        data: []
      });
    }

    res.status(200).json({
      meta: {
        statusCode: 200,
        status: true,
        message: "Employee retrieved successfully."
      },
      data: employee
    });

  } catch (error) {
    console.error("Error retrieving employee:", error);
    res.status(500).json({
      meta: {
        statusCode: 500,
        status: false,
        message: "Server error. Could not retrieve employee."
      }
    });
  }
};


exports.deleteEmployee = async (req, res) => {
  const { employeeId } = req.params;

  try {
    const deletedEmployee = await Employee.findByIdAndDelete(employeeId);

    if (!deletedEmployee) {
      return res.status(404).json({
        meta: {
          statusCode: 404,
          status: false,
          message: "Employee not found with the given ID.",
        },
        data: null,
      });
    }

    res.status(200).json({
      meta: {
        statusCode: 200,
        status: true,
        message: "Employee deleted successfully.",
      },
      data: deletedEmployee,
    });
  } catch (error) {
    console.error("Error deleting employee:", error);
    res.status(500).json({
      meta: {
        statusCode: 500,
        status: false,
        message: "Server error. Could not delete employee.",
      },
    });
  }
};


exports.verifyEmployment = async (req, res) => {
  const { employeeId, employmentIndex } = req.params;
  const { verified } = req.body;

  try {
    const employee = await Employee.findById(employeeId);

    if (!employee) {
      return res.status(404).json({
        meta: {
          statusCode: 404,
          status: false,
          message: 'Employee not found.',
        },
      });
    }

    if (!employee.employmentHistory[employmentIndex]) {
      return res.status(400).json({
        meta: {
          statusCode: 400,
          status: false,
          message: 'Invalid employment index.',
        },
      });
    }

    employee.employmentHistory[employmentIndex].verified = verified;
    await employee.save();

    res.status(200).json({
      meta: {
        statusCode: 200,
        status: true,
        message: 'Employment verification status updated successfully.',
      },
      data: employee,
    });
  } catch (error) {
    console.error('Error updating verification status:', error);
    res.status(500).json({
      meta: {
        statusCode: 500,
        status: false,
        message: 'Server error. Could not update verification status.',
      },
    });
  }
};


exports.updateEmployee = async (req, res) => {
  const { employeeId } = req.params;
  const updatedData = req.body;

  try {
    const updatedEmployee = await Employee.findByIdAndUpdate(
      employeeId,
      { ...updatedData },
      { new: true, runValidators: true }
    );

    if (!updatedEmployee) {
      return res.status(404).json({
        meta: { status: false, message: "Employee not found." },
      });
    }

    res.status(200).json({
      meta: { status: true, message: "Employee updated successfully." },
      data: updatedEmployee,
    });
  } catch (error) {
    console.error("Error updating employee:", error);
    res.status(500).json({
      meta: { status: false, message: "Failed to update employee." },
    });
  }
};


exports.loginEmployee = async (req, res) => {
  const { email, password } = req.body;

  try {
    const employee = await Employee.findOne({ email });
    if (!employee) {
      return res.status(404).json({
        meta: {
          statusCode: 404,
          status: false,
          message: "Employee not found. Please check your email.",
        },
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, employee.password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        meta: {
          statusCode: 401,
          status: false,
          message: "Invalid password. Please try again.",
        },
      });
    }

    // Generate a token
    const payload = {
      employee: {
        id: employee.id,
      },
    };
    const token = jwt.sign(payload, config.get("jwtSecret"), {
      expiresIn: "1h",
    });

    res.status(200).json({
      meta: {
        statusCode: 200,
        status: true,
        message: "Login successful.",
      },
      data: {
        token,
        employee: {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
        },
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({
      meta: {
        statusCode: 500,
        status: false,
        message: "Server error. Please try again later.",
      },
    });
  }
};

