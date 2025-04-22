const Employee = require('../models/employee.model')
const Joi = require('joi');
const Company = require('../models/company.model')
const bcrypt = require("bcrypt");
const sendOtpEmail = require('../notifications/emailService')
const generateOtp = require("../shared/generateOtp");
const config = require("config");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const crypto = require("crypto");
const Token = require('../models/TokenSchema');
const nodemailer = require("nodemailer");
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const employeeSchema = Joi.object({
  firstName: Joi.string().min(1).required().messages({
    'string.base': 'First name should be a string',
    'string.empty': 'First name is required',
  }),
  lastName: Joi.string().min(1).required().messages({
    'string.base': 'Last name should be a string',
    'string.empty': 'Last name is required',
  }),
  email: Joi.string().email().required().messages({
    'string.base': 'Email should be a string',
    'string.email': 'Invalid email format',
    'string.empty': 'Email is required',
  }),
  phoneNumber: Joi.string().optional(),
  country: Joi.string().optional(),
  city: Joi.string().optional(),
  about: Joi.string().allow('').optional(),
  education: Joi.array().items(
    Joi.object({
      levelOfEducation: Joi.string().required(),
      fieldOfStudy: Joi.string().required(),
      fromYear: Joi.number().integer().required(),
      toYear: Joi.number().integer().required(),
    })
  ).optional(),
  languages: Joi.array().items(
    Joi.object({
      language: Joi.string().required(),
      proficiency: Joi.string().optional(),
    })
  ).optional(),
  employmentHistory: Joi.array().items(
    Joi.object({
      jobTitle: Joi.string().required(),
      company: Joi.string().required(),
      location: Joi.string().optional(),
      type: Joi.string().optional(),
      currentlyWorking: Joi.boolean().optional(),
      fromMonth: Joi.string().optional(),
      fromYear: Joi.number().optional(),
      toMonth: Joi.string().optional(),
      toYear: Joi.number().optional(),
      description: Joi.string().optional(),
      verified: Joi.boolean().optional(),
    })
  ).optional(),
  skills: Joi.array().items(Joi.object({
    skillName: Joi.string().required(),
  })).optional(),
  companyRefId: Joi.string().optional(),
  selfEnrolled: Joi.boolean().required(),
  password: Joi.string().regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+={}:;"'<>,.?/|\\~`]).{8,}$/).required().messages({
    'string.base': 'Password should be a string',
    'string.empty': 'Password is required',
    'string.pattern.base': 'Password must contain at least one uppercase letter, one digit, one special character, and be at least 8 characters long'
  }),
  
});


exports.addEmployee = async (req, res) => {
  try {
    const { sso, email } = req.body;

    if (!email) {
      return res.status(400).json({
        meta: {
          statusCode: 400,
          status: false,
          message: "Email is required.",
        },
      });
    }

    const existingEmployee = await Employee.findOne({ email });

    if (existingEmployee) {
      if (!sso) {
        return res.status(409).json({
          meta: {
            statusCode: 409,
            status: false,
            message: `An account with email ${email} already exists.`,
          },
        });
      }

      const token = jwt.sign(
        { employeeId: existingEmployee._id },
        config.get("jwtSecret"),
        { expiresIn: config.get("TokenExpire") }
      );

      return res.status(200).json({
        meta: {
          statusCode: 200,
          status: true,
          message: "Logged in successfully via SSO.",
        },
        data: {
          token: token,
          employee: {
            id: existingEmployee._id,
            firstName: existingEmployee.firstName,
            lastName: existingEmployee.lastName,
            email: existingEmployee.email,
          },
        },
        redirectUrl: "/dashboard",
      });
    }
    if (sso === true) {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({
          meta: {
            statusCode: 400,
            status: false,
            message: "Name is required for SSO signup.",
          },
        });
      }

      const [firstName, ...rest] = name.split(' ');
      const lastName = rest.join(' ') || "";

      const newEmployee = new Employee({
        firstName,
        lastName,
        email,
        sso: true,
        selfEnrolled: true,
        isEmailVerified: true,
      });

      await newEmployee.save();

      const token = jwt.sign(
        { employeeId: newEmployee._id },
        config.get("jwtSecret"),
        { expiresIn: config.get("TokenExpire") }
      );

      return res.status(201).json({
        meta: {
          statusCode: 201,
          status: true,
          message: "SSO Employee created successfully.",
        },
        data: {
          token: token,
          employee: {
            id: newEmployee._id,
            firstName: newEmployee.firstName,
            lastName: newEmployee.lastName,
            email: newEmployee.email,
          },
        },
        redirectUrl: "/dashboard",
      });
    }

    const { error } = employeeSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        meta: {
          statusCode: 400,
          status: false,
          message: 'Validation failed.',
          errors: error.details.map((err) => err.message),
        },
      });
    }

    const {
      firstName,
      lastName,
      country,
      city,
      phoneNumber,
      password,
      about,
      education,
      languages,
      employmentHistory,
      skills,
      companyRefId,
      selfEnrolled,
    } = req.body;

    if (!firstName || !lastName || typeof selfEnrolled !== "boolean") {
      return res.status(400).json({
        meta: {
          statusCode: 400,
          status: false,
          message: "Missing required fields: firstName, lastName, or selfEnrolled.",
        },
      });
    }

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
          message: "Employee registered successfully. OTP sent to email.",
        },
        data: { id: newEmployee._id, email: newEmployee.email },
      });
    }

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

      const newEmployee = new Employee({
        firstName,
        lastName,
        about,
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

      const emailBody = `
        Hello ${firstName},
        Your account has been created by your company.
        Email: ${email}
        Password: ${password}
        Please change your password after logging in.
      `;

      await sendOtpEmail(email, emailBody);

      return res.status(201).json({
        meta: {
          statusCode: 201,
          status: true,
          message: "Employee added successfully by the company.",
        },
        data: newEmployee,
      });
    }

    return res.status(400).json({
      meta: {
        statusCode: 400,
        status: false,
        message: "Invalid request. Please provide proper flags.",
      },
    });

  } catch (error) {
    console.error("Error adding employee:", error.message);
    return res.status(500).json({
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
    const { employeeId, requestId } = req.params; // Make sure both employeeId and requestId are available here
    const { status } = req.body;

    // Validate that the status is either "Approved" or "Rejected"
    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        meta: { statusCode: 400, status: false, message: "Invalid status. Allowed: Approved, Rejected" },
      });
    }

    // Find the employee by ID
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        meta: { statusCode: 404, status: false, message: "Employee not found." },
      });
    }

    // Log Employee and Verification Requests for debugging
    console.log("Employee Data:", employee);
    console.log("Employee Verification Requests:", employee.verificationRequests);
    console.log("Request ID:", requestId);

    // Find the verification request by ID
    const request = employee.verificationRequests.find(req => req._id.toString() === requestId);
    console.log("Found Request:", request);

    if (!request) {
      return res.status(404).json({
        meta: { statusCode: 404, status: false, message: "Verification request not found." },
      });
    }

    // Update the status of the request
    request.status = status;
    await employee.save();

    // Return success response
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


exports.submitRating = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { status, rating, comment, selectedOptions } = req.body;

    console.log("Employee ID in backend:", employeeId);

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        meta: { statusCode: 404, status: false, message: "Employee not found." },
      });
    }

    employee.ratings.push({
      rating,
      comment,
      selectedOptions,
      date: new Date(),
      status: 'Approved',
    });

    await employee.save();

    return res.status(200).json({
      meta: { statusCode: 200, status: true, message: `Rating submitted with status: ${status}` },
    });
  } catch (error) {
    console.error("Error saving status and rating:", error);
    return res.status(500).json({
      meta: { statusCode: 500, status: false, message: "Server error. Could not update status and rating." },
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

    // Filter employees based on company-specific blocks
    const blockedEmployees = [];
    const unblockedEmployees = [];

    employees.forEach(employee => {
      // Check if employee has a companyBlock for this specific company
      const companyBlock = employee.companyBlocks?.find(block => block.companyRefId === companyRefId);

      if (companyBlock && companyBlock.isBlocked) {
        blockedEmployees.push(employee);
      } else {
        unblockedEmployees.push(employee);
      }
    });

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
  const { isBlocked, comment, companyRefId } = req.body;

  console.log("companyRefId in back-end:", companyRefId);

  try {
    if (!companyRefId) {
      return res.status(400).json({
        meta: { statusCode: 400, status: false, message: "companyRefId is required." }
      });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        meta: { statusCode: 404, status: false, message: "Employee not found." }
      });
    }

    if (!employee.companyBlocks) {
      employee.companyBlocks = [];
    }

    let companyBlock = employee.companyBlocks.find(block => block.companyRefId === companyRefId);

    if (companyBlock) {
      companyBlock.isBlocked = isBlocked;
      companyBlock.comment = comment;
    } else {
      employee.companyBlocks.push({
        companyRefId: companyRefId,
        isBlocked: isBlocked,
        comment: comment,
      });
    }

    await employee.save();

    res.status(200).json({
      meta: {
        statusCode: 200,
        status: true,
        message: `Employee ${isBlocked ? "blocked" : "unblocked"} successfully.`
      }
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

  if (!mongoose.Types.ObjectId.isValid(companyId)) {
    return res.status(400).json({
      meta: {
        statusCode: 400,
        status: false,
        message: "Invalid company ID format.",
      },
      data: null,
    });
  }
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


exports.generateAndSendLink = async (req, res) => {
  try {
    const { email, companyRefId, companyName } = req.body;

    if (!email || !companyRefId) {
      return res.status(400).json({
        meta: {
          status: "error",
          message: "Missing required fields.",
        },
      });
    }

    const existingUser = await Employee.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        meta: {
          status: "error",
          message: "Email is already registered.",
        },
      });
    }

    const token = jwt.sign(
      { email, companyRefId, companyName, role: 'employee' },
      config.get("jwtSecret"),
      { expiresIn: config.get("TokenExpire") }
    );

    res.setHeader('Authorization', `Bearer ${token}`);

    const link = `${config.get("frontendBaseUrl")}/add-employee?token=${token}`;
    const emailBody = `Click the following link to register: ${link}`;

    await sendOtpEmail(email, emailBody);

    return res.status(200).json({
      meta: {
        status: "success",
        message: "Registration link has been sent to your email.",
      },
      data: {
        link,
      },
    });
  } catch (error) {
    console.error("Error generating and sending link:", error);
    return res.status(500).json({
      meta: {
        status: "error",
        message: "Error generating or sending the registration link.",
      },
    });
  }
};

// Add this function to your employee controller file

exports.getEmployeeRatings = async (req, res) => {
  const { employeeId } = req.params;

  try {
    const employee = await Employee.findById(employeeId);

    if (!employee) {
      return res.status(404).json({
        meta: {
          statusCode: 404,
          status: false,
          message: "Employee not found with the given ID."
        },
        data: null
      });
    }

    const ratings = employee.ratings || [];

    let averageRating = 0;
    if (ratings.length > 0) {
      const totalRating = ratings.reduce((sum, rating) => sum + rating.rating, 0);
      averageRating = (totalRating / ratings.length).toFixed(1);
    }

    const approvedRatings = ratings.filter(rating => rating.status === "Approved");

    return res.status(200).json({
      meta: {
        statusCode: 200,
        status: true,
        message: "Employee ratings retrieved successfully."
      },
      data: {
        averageRating,
        totalReviews: ratings.length,
        approvedReviews: approvedRatings.length,
        ratings: approvedRatings
      }
    });
  } catch (error) {
    console.error("Error retrieving employee ratings:", error);
    return res.status(500).json({
      meta: {
        statusCode: 500,
        status: false,
        message: "Server error. Could not retrieve employee ratings."
      },
      data: null
    });
  }
};


// Public API
exports.getAllEmployees = async (req, res) => {
  try {
    // Find all employees
    const employees = await Employee.find({})
      // Remove sensitive information
      .select('-password -otp -isEmailVerified -__v');

    // Check if employees exist
    if (!employees || employees.length === 0) {
      return res.status(404).json({
        meta: {
          statusCode: 404,
          status: false,
          message: "No employees found."
        },
        data: []
      });
    }

    // Return success response
    res.status(200).json({
      meta: {
        statusCode: 200,
        status: true,
        message: "Employees retrieved successfully.",
        count: employees.length
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