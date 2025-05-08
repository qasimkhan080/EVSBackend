const Joi = require('@hapi/joi');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const Company = require("../models/company.model")
const generateOtp = require("../shared/generateOtp");
const sendOtpEmail = require('../notifications/emailService');
const employeeModel = require('../models/employee.model');
const { v4: uuidv4 } = require("uuid");

exports.sendOtp = async (req, res) => {
    console.log("📥 Received Payload:", req.body);

    const { email, password } = req.body;

    const schema = Joi.object({
        email: Joi.string()
            .email({ tlds: { allow: false } })
            .max(40)
            .required()
            .messages({
                "string.email": "Invalid email format.",
                "string.max": "Email must not exceed 40 characters.",
                "any.required": "Email is required."
            }),
        password: Joi.string()
            .min(8)
            .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$"))
            .required()
            .messages({
                "string.min": "Password must be at least 8 characters long.",
                "string.pattern.base": "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
                "any.required": "Password is required."
            })
    });

    const { error } = schema.validate({ email, password });

    if (error) {
        return res.status(400).json({
            meta: {
                statusCode: 400,
                status: false,
                message: error.details[0].message
            }
        });
    }

    try {
        let existingCompany = await Company.findOne({ email });

        if (existingCompany) {
            return res.status(409).json({
                meta: {
                    statusCode: 409,
                    status: false,
                    message: "Email already in use!"
                }
            });
        }

        const otp = generateOtp();
        const hashedPassword = await bcrypt.hash(password, 10);

        const authToken = jwt.sign(
            { email, password: hashedPassword, otpCount: 1 },
            config.get("AuthSecret"),
            { expiresIn: "1h" }
        );

        const otpToken = jwt.sign(
            { email, otp, password: hashedPassword, otpCount: 1 },
            config.get("OtpSecret"),
            { expiresIn: "2m" }
        );

        await sendOtpEmail(email, otp);

        return res.status(200).json({
            meta: {
                statusCode: 200,
                status: true,
                message: "OTP sent successfully. Verify within 2 minutes."
            },
            data: {
                authToken,
                otpToken
            }
        });

    } catch (error) {
        console.error("Error in sendOtp:", error);
        return res.status(500).json({
            meta: {
                statusCode: 500,
                status: false,
                message: "Internal Server Error"
            }
        });
    }
};


exports.verifySignupOtp = async (req, res) => {
    const otpToken = req.header("x-auth-token");

    if (!otpToken) {
        console.error("No OTP Token Provided");
        return res.status(401).json({
            meta: {
                statusCode: 401,
                status: false,
                message: "No OTP Token provided.",
            },
        });
    }

    try {
        console.log("Decoding OTP Token...");
        const decoded = jwt.verify(otpToken, config.get("OtpSecret"));

        console.log("Decoded OTP Token:", decoded);

        if (!decoded.email || !decoded.otp) {
            console.error("Decoded Token Missing Fields:", decoded);
            return res.status(401).json({
                meta: {
                    statusCode: 401,
                    status: false,
                    message: "Invalid or expired OTP token!",
                },
            });
        }

        const { otp } = req.body;
        if (!otp) {
            return res.status(400).json({
                meta: {
                    statusCode: 400,
                    status: false,
                    message: "OTP is required",
                },
            });
        }

        if (otp !== decoded.otp) {
            console.error("Incorrect OTP!");
            return res.status(400).json({
                meta: {
                    statusCode: 400,
                    status: false,
                    message: "Incorrect OTP!",
                },
            });
        }

        let company = await Company.findOne({ email: decoded.email });

        if (!company) {
            console.log("Creating new company after OTP verification...");

            company = new Company({
                email: decoded.email,
                password: decoded.password,
                isEmailVerified: true,
                companyRefId: uuidv4(),
            });

            await company.save();
        } else {
            console.log("🔹 Company Already Exists. Updating verification status...");
            company.isEmailVerified = true;
            await company.save();
        }

        const authPayload = { email: company.email, companyId: company._id };
        const authToken = jwt.sign(authPayload, config.get("jwtSecret"), { expiresIn: "20m" });

        return res.status(200).json({
            meta: {
                statusCode: 200,
                status: true,
                message: "✅ Email successfully verified! Company created.",
            },
            data: {
                authToken,
                company: {
                    email: company.email,
                    isEmailVerified: company.isEmailVerified,
                    companyRefId: company.companyRefId,
                },
            },
        });

    } catch (error) {
        console.error("OTP Verification Error:", error);

        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                meta: {
                    statusCode: 401,
                    status: false,
                    message: "OTP token has expired! Please request a new one.",
                },
            });
        }

        return res.status(500).json({
            meta: {
                statusCode: 500,
                status: false,
                message: "Internal server error.",
            },
        });
    }
};


exports.registerCompany = async (req, res) => {
    const {
        companyName, 
        location,
        companySize,
        industry,
        companyWebsite,
        phoneNumber,
        foundingYear,
        heardAboutUs
    } = req.body;
    
    const authToken = req.header("x-auth-token");

    if (!authToken) {
        return res.status(401).json({
            meta: {
                statusCode: 401,
                status: false,
                message: "No token provided. Authorization denied.",
            },
        });
    }

    try {
        const decoded = jwt.verify(authToken, config.get("jwtSecret"));

        if (!decoded || !decoded.companyId) {
            return res.status(401).json({
                meta: {
                    statusCode: 401,
                    status: false,
                    message: "Invalid token. Company ID missing.",
                },
            });
        }

        let company = await Company.findById(decoded.companyId);

        if (!company) {
            return res.status(404).json({
                meta: {
                    statusCode: 404,
                    status: false,
                    message: "Company not found!",
                },
            });
        }

        const schema = Joi.object({
            companyName: Joi.string().min(2).max(50).required().messages({
                "string.empty": "Company Name is required",
                "string.min": "Company Name must be at least 2 characters",
                "string.max": "Company Name cannot exceed 50 characters"
            }),
            location: Joi.string().required().messages({
                "string.empty": "Location is required",
            }),
            companySize: Joi.string().valid("1 to 10", "11 to 30", "31 to 50", "51 to 100", "101 to 500", "501 to 1000", "1000+").required().messages({
                "string.empty": "Company Size is required",
                "any.only": "Invalid Company Size selection"
            }),
            industry: Joi.string().required().messages({
                "string.empty": "Industry is required",
            }),
            
            companyWebsite: Joi.string().uri().required().messages({
                "string.empty": "Company Website is required",
                "string.uri": "Invalid website URL format"
            }),
            phoneNumber: Joi.string()
                .pattern(/^\+?\d{09,15}$/)
                .required()
                .messages({
                    "string.empty": "Phone Number is required",
                    "string.pattern.base": "Phone Number must be 10-15 digits and can start with '+'",
                    "string.min": "Phone Number must be at least 10 digits",
                    "string.max": "Phone Number cannot exceed 15 digits"
                }),
            foundingYear: Joi.number()
                .integer()
                .min(1900)
                .max(new Date().getFullYear())
                .required()
                .messages({
                    "number.base": "Founding Year must be a number",
                    "number.integer": "Founding Year must be a whole number",
                    "number.min": "Founding Year must be at least 1900",
                    "number.max": `Founding Year cannot be later than ${new Date().getFullYear()}`,
                    "any.required": "Founding Year is required"
                }),
            heardAboutUs: Joi.string().required().messages({
                "string.empty": "How you heard about us is required",
            })
        });

        const { error } = schema.validate(req.body, { abortEarly: false });
        if (error) {
            return res.status(400).json({
                meta: {
                    statusCode: 400,
                    status: false,
                    message: "Validation Error",
                    errors: error.details.map((err) => err.message),
                },
            });
        }

        Object.assign(company, { 
            companyName, 
            location,
            companySize,
            industry, 
            companyWebsite, 
            phoneNumber, 
            foundingYear,
            heardAboutUs 
        });
        
        await company.save();

        return res.status(201).json({
            meta: {
                statusCode: 201,
                status: true,
                message: "✅ Company registered successfully!",
            },
            data: {
                email: company.email,
                companyName: company.companyName,
                location: company.location,
                companySize: company.companySize,
                industry: company.industry,
                companyWebsite: company.companyWebsite,
                phoneNumber: company.phoneNumber,
                foundingYear: company.foundingYear,
                heardAboutUs: company.heardAboutUs,
            },
        });

    } catch (error) {
        console.error("Error registering company:", error);

        if (error.name === "JsonWebTokenError") {
            return res.status(400).json({
                meta: {
                    statusCode: 400,
                    status: false,
                    message: "Invalid token provided!",
                },
            });
        }
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                meta: {
                    statusCode: 401,
                    status: false,
                    message: "Token expired. Please log in again.",
                },
            });
        }

        return res.status(500).json({
            meta: {
                statusCode: 500,
                status: false,
                message: "Internal Server Error",
            },
        });
    }
};


exports.getCompanyByRefId = async (req, res) => {
    const { companyRefId } = req.params;

    try {
        const company = await Company.findOne({ companyRefId }); // Use companyRefId to query the database

        if (!company) {
            return res.status(404).json({
                meta: {
                    statusCode: 404,
                    status: false,
                    message: "Company not found",
                },
            });
        }

        res.status(200).json({
            data: company,
            meta: {
                statusCode: 200,
                status: true,
                message: "Company details fetched successfully",
            },
        });
    } catch (error) {
        console.error("Error fetching company details:", error.message);
        res.status(500).json({
            meta: {
                statusCode: 500,
                status: false,
                message: "Internal server error",
            },
        });
    }
};


exports.deleteCompany = async (req, res) => {
    const { companyId } = req.params;

    try {
        const deletedCompany = await Company.findByIdAndDelete(companyId);

        if (!deletedCompany) {
            return res.status(404).json({
                meta: {
                    statusCode: 404,
                    status: false,
                    message: "Company not found",
                },
            });
        }

        res.status(200).json({
            meta: {
                statusCode: 200,
                status: true,
                message: "Company deleted successfully",
            },
        });
    } catch (error) {
        console.error("Error deleting company:", error.message);
        res.status(500).json({
            meta: {
                statusCode: 500,
                status: false,
                message: "Internal server error",
            },
        });
    }
};


exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        let company = await Company.findOne({ email }, { otpCount: 0, deletedAt: 0, updatedAt: 0 });

        if (!company) {
            return res.status(404).json({
                meta: {
                    statusCode: 404,
                    status: false,
                    message: "company not found",
                },
            });
        }

        const isMatch = await bcrypt.compare(password, company.password);

        if (!isMatch) {
            return res.status(400).json({
                meta: { statusCode: 400, status: false, message: "Invalid credentials", },
            });
        }
        const baseUrl = `${req.protocol}://${req.get("host")}/uploads/images/`;

        const data = {
            _id: company._id,
            email: company.email,
            companyName: company.companyName,
            companyLogo: company.companyLogo ? baseUrl + company.companyLogo : null,
            status: company.status,
            companySize: company.companySize,
            phoneNumber: company.phoneNumber,
            firstName: company.firstName,
            secondName: company.secondName,
            heardAboutUs: company.heardAboutUs,
            companyWebsite: company.companyWebsite,
            companyRefId: company.companyRefId,

        }
        // console.log("Company Logo URL Sent to Frontend:", data.companyLogo); // ✅ Debugging

        const payload = { store: { id: company.id, status: company['status'] } }
        let token = jwt.sign(payload, config.get('jwtSecret'), { expiresIn: config.get('TokenExpire') })
        res.status(200).json({ meta: { statusCode: 200, status: true, message: "Login successful", }, data: { token: token, company: data }, });
    } catch (error) {
        console.error("Error during login:", error); res.status(500).json({
            meta: { statusCode: 500, status: false, message: "Server error", },
        });
    }
};


exports.getVerificationRequestsForCompany = async (req, res) => {
    const { companyRefId } = req.params;

    if (!companyRefId) {
        return res.status(400).json({
            meta: {
                statusCode: 400,
                status: false,
                message: "Company reference ID is required",
            },
        });
    }

    try {
        const company = await Company.findOne({ companyRefId });

        if (!company) {
            return res.status(404).json({
                meta: {
                    statusCode: 404,
                    status: false,
                    message: "Company not found",
                },
            });
        }

        // Check if receivedRequests field exists
        const receivedRequests = company.receivedRequests || [];
        
        res.status(200).json({
            meta: {
                statusCode: 200,
                status: true,
                message: "Verification requests retrieved successfully.",
            },
            data: receivedRequests,
        });
    } catch (error) {
        console.error("Error fetching verification requests for company:", error);
        res.status(500).json({
            meta: {
                statusCode: 500,
                status: false,
                message: "Server error. Could not fetch verification requests.",
            },
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
  
      // Find the employee
      const employee = await Employee.findById(employeeId);
      if (!employee) {
        return res.status(404).json({
          meta: { statusCode: 404, status: false, message: "Employee not found." },
        });
      }
  
      // Find the request in employee's verificationRequests
      const employeeRequestIndex = employee.verificationRequests.findIndex(
        req => req._id.toString() === requestId
      );
      
      if (employeeRequestIndex === -1) {
        return res.status(404).json({
          meta: { statusCode: 404, status: false, message: "Verification request not found in employee records." },
        });
      }
  
      // Get the companyId from the request
      const companyId = employee.verificationRequests[employeeRequestIndex].companyId;
      
      // Find the company
      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          meta: { statusCode: 404, status: false, message: "Company not found." },
        });
      }
  
      // Find the request in company's receivedRequests
      const companyRequestIndex = company.receivedRequests.findIndex(
        req => req._id.toString() === requestId
      );
      
      if (companyRequestIndex === -1) {
        return res.status(404).json({
          meta: { statusCode: 404, status: false, message: "Verification request not found in company records." },
        });
      }
  
      // Update status in both employee and company records
      employee.verificationRequests[employeeRequestIndex].status = status;
      company.receivedRequests[companyRequestIndex].status = status;
  
      // Save both documents
      await employee.save();
      await company.save();
  
      return res.status(200).json({
        meta: { statusCode: 200, status: true, message: `Request ${status.toLowerCase()} successfully.` },
      });
    } catch (error) {
      console.error("Error updating verification status:", error);
      return res.status(500).json({
        meta: { statusCode: 500, status: false, message: "Server error. Could not update status." },
      });
    }
  };
exports.getVerificationStats = async (req, res) => {
    try {
      const { companyRefId } = req.params;
      
      if (!companyRefId) {
        return res.status(400).json({
          meta: { statusCode: 400, status: false, message: "Company reference ID is required" },
        });
      }
  
      const company = await Company.findOne({ companyRefId });
      if (!company) {
        return res.status(404).json({
          meta: { statusCode: 404, status: false, message: "Company not found" },
        });
      }
  
      const requests = company.receivedRequests || [];
      
      // Count requests by status
      const pending = requests.filter(req => req.status === "Pending").length;
      const approved = requests.filter(req => req.status === "Approved").length;
      const rejected = requests.filter(req => req.status === "Rejected").length;
      
      return res.status(200).json({
        meta: {
          statusCode: 200,
          status: true,
          message: "Verification statistics retrieved successfully",
        },
        data: {
          total: requests.length,
          pending,
          approved,
          rejected
        }
      });
    } catch (error) {
      console.error("Error fetching verification stats:", error);
      return res.status(500).json({
        meta: { statusCode: 500, status: false, message: "Server error" },
      });
    }
  };


// //Public API
// exports.getAllCompanies = async (req, res) => {
//     try {
//       const companies = await Company.find({});
  
//       if (!companies || companies.length === 0) {
//         return res.status(404).json({
//           meta: { 
//             statusCode: 404, 
//             status: false, 
//             message: "No companies found." 
//           },
//           data: []
//         });
//       }
  
//       res.status(200).json({
//         meta: { 
//           statusCode: 200, 
//           status: true, 
//           message: "Companies retrieved successfully." 
//         },
//         data: companies
//       });
//     } catch (error) {
//       console.error("Error retrieving companies:", error);
//       res.status(500).json({
//         meta: { 
//           statusCode: 500, 
//           status: false, 
//           message: "Server error. Could not retrieve companies." 
//         }
//       });
//     }
//   };

