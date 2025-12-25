const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const Employee = require('../models/employee.model');
const Company = require('../models/company.model');
const mongoose = require('mongoose');
const config = require('config');
const fs = require('fs');
const path = require('path');

const s3Client = new S3Client({
  region: config.get("AWS_REGION"),
  credentials: {
    accessKeyId: config.get("AWS_ACCESS_KEY"),
    secretAccessKey: config.get("AWS_SECRET_KEY"),
  }
});

exports.uploadBanner = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        meta: { statusCode: 400, status: false, message: "No banner image uploaded" }
      });
    }

    const userId = req.body.userId;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      if (req.file.path && !req.file.location) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        meta: { statusCode: 400, status: false, message: "Valid User ID is required" }
      });
    }

    if (!req.file.mimetype.startsWith('image/')) {
      if (req.file.path && !req.file.location) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        meta: { statusCode: 400, status: false, message: "Invalid file type. Only image files are allowed." }
      });
    }

    const isS3Upload = !!req.file.location;
    const fileUrl = isS3Upload ? req.file.location :
      `${process.env.serverBaseUrl || 'http://localhost:5000'}/uploads/banners/${req.file.filename}`;
    const s3Key = req.file.key || req.file.filename;
    const uniqueKey = `${Date.now()}_${uuidv4()}`;

    const employee = await Employee.findById(userId);
    if (!employee) {
      if (req.file.path && !req.file.location) fs.unlinkSync(req.file.path);
      return res.status(404).json({
        meta: { statusCode: 404, status: false, message: "Employee not found" }
      });
    }

    const existingBannerIndex = employee.documents.findIndex(doc => doc.type === 'banner');
    if (existingBannerIndex !== -1) {
      const existingBanner = employee.documents[existingBannerIndex];

      if (existingBanner.s3Key && isS3Upload) {
        try {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: config.get("AWS_S3_BUCKET_NAME"),
            Key: existingBanner.s3Key
          }));
        } catch (s3Error) {
          console.error("Error deleting previous banner from S3:", s3Error);
        }
      }
      else if (existingBanner.url && !isS3Upload) {
        const filename = existingBanner.url.split('/').pop();
        const filePath = path.join(__dirname, '../uploads/banners', filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }

      employee.documents.splice(existingBannerIndex, 1);
    }

    const newDocument = {
      type: 'banner',
      url: fileUrl,
      name: req.file.originalname,
      size: req.file.size,
      uploadedAt: new Date(),
      s3Key: isS3Upload ? s3Key : undefined,
      uniqueId: uniqueKey
    };

    employee.documents.push(newDocument);
    await employee.save();

    return res.status(200).json({
      meta: {
        statusCode: 200,
        status: true,
        message: "Banner uploaded successfully"
      },
      data: {
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        isS3Upload,
        userId,
        uniqueId: uniqueKey
      }
    });

  } catch (error) {
    console.error("Banner upload failed:", error);
    if (req.file?.path && !req.file?.location) fs.unlinkSync(req.file.path);

    return res.status(500).json({
      meta: { statusCode: 500, status: false, message: "Banner upload failed: " + error.message }
    });
  }
};


exports.uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        meta: { statusCode: 400, status: false, message: "No profile image uploaded" }
      });
    }

    const userId = req.body.userId;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      if (req.file.path && !req.file.location) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        meta: { statusCode: 400, status: false, message: "Valid User ID is required" }
      });
    }

    if (!req.file.mimetype.startsWith('image/')) {
      if (req.file.path && !req.file.location) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        meta: { statusCode: 400, status: false, message: "Invalid file type. Only image files are allowed." }
      });
    }

    const isS3Upload = !!req.file.location;
    const fileUrl = isS3Upload ? req.file.location :
      `${process.env.serverBaseUrl || 'http://localhost:5000'}/uploads/profileimages/${req.file.filename}`;
    const s3Key = req.file.key || req.file.filename;
    const uniqueKey = `${Date.now()}_${uuidv4()}`;

    const employee = await Employee.findById(userId);
    if (!employee) {
      if (req.file.path && !req.file.location) fs.unlinkSync(req.file.path);
      return res.status(404).json({
        meta: { statusCode: 404, status: false, message: "Employee not found" }
      });
    }

    const existingProfileImageIndex = employee.documents.findIndex(doc => doc.type === 'profilepic');
    if (existingProfileImageIndex !== -1) {
      const existingImage = employee.documents[existingProfileImageIndex];

      if (existingImage.s3Key && isS3Upload) {
        try {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: config.get("AWS_S3_BUCKET_NAME"),
            Key: existingImage.s3Key
          }));
        } catch (s3Error) {
          console.error("Error deleting previous profile image from S3:", s3Error);
        }
      }
      else if (existingImage.url && !isS3Upload) {
        const filename = existingImage.url.split('/').pop();
        const filePath = path.join(__dirname, '../uploads/profileimages', filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }

      employee.documents.splice(existingProfileImageIndex, 1);
    }

    const newDocument = {
      type: 'profilepic',
      url: fileUrl,
      name: req.file.originalname,
      size: req.file.size,
      uploadedAt: new Date(),
      s3Key: isS3Upload ? s3Key : undefined,
      uniqueId: uniqueKey
    };

    employee.documents.push(newDocument);
    await employee.save();

    return res.status(200).json({
      meta: {
        statusCode: 200,
        status: true,
        message: "Profile image uploaded successfully"
      },
      data: {
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        isS3Upload,
        userId,
        uniqueId: uniqueKey
      }
    });

  } catch (error) {
    console.error("Profile image upload failed:", error);
    if (req.file?.path && !req.file?.location) fs.unlinkSync(req.file.path);

    return res.status(500).json({
      meta: { statusCode: 500, status: false, message: "Profile image upload failed: " + error.message }
    });
  }
};

exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        meta: { statusCode: 400, status: false, message: "No resume file uploaded" }
      });
    }

    const userId = req.body.userId;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      if (req.file.path && !req.file.location) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        meta: { statusCode: 400, status: false, message: "Valid User ID is required" }
      });
    }

    if (req.file.mimetype !== 'application/pdf') {
      if (req.file.path && !req.file.location) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        meta: { statusCode: 400, status: false, message: "Invalid file type. Only PDF allowed." }
      });
    }

    const isS3Upload = !!req.file.location;
    const fileUrl = isS3Upload ? req.file.location : `${process.env.serverBaseUrl || 'http://localhost:5000'}/uploads/resume/${req.file.filename}`;
    const s3Key = req.file.key || req.file.filename;
    const uniqueKey = `${Date.now()}_${uuidv4()}`;

    const employee = await Employee.findById(userId);
    if (!employee) {
      if (req.file.path && !req.file.location) fs.unlinkSync(req.file.path);
      return res.status(404).json({
        meta: { statusCode: 404, status: false, message: "Employee not found" }
      });
    }

    const existingResumeIndex = employee.documents.findIndex(doc => doc.type === 'resume');
    if (existingResumeIndex !== -1) {
      const existingResume = employee.documents[existingResumeIndex];

      if (existingResume.s3Key && isS3Upload) {
        try {
          const deleteParams = {
            Bucket: config.get("AWS_S3_BUCKET_NAME"),
            Key: existingResume.s3Key
          };
          await s3Client.send(new DeleteObjectCommand(deleteParams));
        } catch (s3Error) {
          console.error("Error deleting previous resume from S3:", s3Error);
        }
      }
      else if (existingResume.url && !isS3Upload) {
        const filename = existingResume.url.split('/').pop();
        const filePath = path.join(__dirname, '../uploads/resume', filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }

      employee.documents.splice(existingResumeIndex, 1);
    }

    const newDocument = {
      type: 'resume',
      url: fileUrl,
      name: req.file.originalname,
      size: req.file.size,
      uploadedAt: new Date(),
      s3Key: isS3Upload ? s3Key : undefined,
      uniqueId: uniqueKey
    };

    employee.documents.push(newDocument);

    await employee.save();

    return res.status(200).json({
      meta: { statusCode: 200, status: true, message: "Resume uploaded successfully" },
      data: {
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        isS3Upload,
        userId,
        uniqueId: uniqueKey
      }
    });

  } catch (error) {
    console.error("Resume upload failed:", error);
    if (req.file?.path && !req.file?.location) fs.unlinkSync(req.file.path);

    return res.status(500).json({
      meta: { statusCode: 500, status: false, message: "Resume upload failed: " + error.message }
    });
  }
};

exports.uploadEducation = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        meta: { statusCode: 400, status: false, message: "No education file uploaded" }
      });
    }

    const userId = req.body.userId;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      if (req.file.path && !req.file.location) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        meta: { statusCode: 400, status: false, message: "Valid User ID is required" }
      });
    }

    if (!req.file.mimetype.startsWith('image/')) {
      if (req.file.path && !req.file.location) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        meta: { statusCode: 400, status: false, message: "Invalid file type. Only image files are allowed." }
      });
    }

    const isS3Upload = !!req.file.location;
    const fileUrl = isS3Upload ? req.file.location :
      `${process.env.serverBaseUrl || 'http://localhost:5000'}/uploads/education/${req.file.filename}`;
    const s3Key = req.file.key || req.file.filename;
    const uniqueKey = `${Date.now()}_${uuidv4()}`;

    const employee = await Employee.findById(userId);
    if (!employee) {
      if (req.file.path && !req.file.location) fs.unlinkSync(req.file.path);
      return res.status(404).json({
        meta: { statusCode: 404, status: false, message: "Employee not found" }
      });
    }

    const existingEducationIndex = employee.documents.findIndex(doc => doc.type === 'education');
    if (existingEducationIndex !== -1) {
      const existingEducation = employee.documents[existingEducationIndex];

      if (existingEducation.s3Key && isS3Upload) {
        try {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: config.get("AWS_S3_BUCKET_NAME"),
            Key: existingEducation.s3Key
          }));
        } catch (s3Error) {
          console.error("Error deleting previous education document from S3:", s3Error);
        }
      }
      else if (existingEducation.url && !isS3Upload) {
        const filename = existingEducation.url.split('/').pop();
        const filePath = path.join(__dirname, '../uploads/education', filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }

      employee.documents.splice(existingEducationIndex, 1);
    }

    const newDocument = {
      type: 'education',
      url: fileUrl,
      name: req.file.originalname,
      size: req.file.size,
      uploadedAt: new Date(),
      s3Key: isS3Upload ? s3Key : undefined,
      uniqueId: uniqueKey
    };

    employee.documents.push(newDocument);

    await employee.save();

    return res.status(200).json({
      meta: {
        statusCode: 200,
        status: true,
        message: "Education document uploaded successfully"
      },
      data: {
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        isS3Upload,
        userId,
        uniqueId: uniqueKey
      }
    });

  } catch (error) {
    console.error("Education document upload failed:", error);
    if (req.file?.path && !req.file?.location) fs.unlinkSync(req.file.path);

    return res.status(500).json({
      meta: { statusCode: 500, status: false, message: "Education document upload failed: " + error.message }
    });
  }
};

exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        meta: { statusCode: 400, status: false, message: "No image uploaded" }
      });
    }

    const userId = req.body.userId;
    if (!userId) {
      return res.status(400).json({
        meta: { statusCode: 400, status: false, message: "User ID is required" }
      });
    }

    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        meta: { statusCode: 400, status: false, message: "Invalid file type. Only images allowed." }
      });
    }

    const isS3Upload = !!req.file.location;
    const timestamp = Date.now();
    const uuid = uuidv4();
    const uniqueKey = `${timestamp}_${uuid}`;

    let fileUrl = isS3Upload ? req.file.location :
      `${process.env.serverBaseUrl || 'http://localhost:5000'}/uploads/images/${req.file.filename}`;
    let s3Key = req.file.key || req.file.filename;

    const employee = await Employee.findById(userId);
    if (!employee) {
      return res.status(404).json({
        meta: { statusCode: 404, status: false, message: "Employee not found" }
      });
    }

    const existingImage = employee.documents.find(doc => doc.type === 'image');
    if (existingImage && existingImage.s3Key) {
      try {
        await s3.deleteObject({
          Bucket: config.get("AWS_S3_BUCKET_NAME"),
          Key: existingImage.s3Key
        }).promise();
      } catch (s3Error) {
        console.error("Error deleting previous image from S3:", s3Error);
      }
    }

    employee.documents = employee.documents.filter(doc => doc.type !== 'image');

    const newDocument = {
      url: fileUrl,
      name: req.file.originalname,
      type: 'image',
      size: req.file.size,
      uploadedAt: new Date(),
      s3Key: s3Key,
      uniqueId: uniqueKey
    };

    employee.documents.push(newDocument);
    await employee.save();

    return res.status(200).json({
      meta: {
        statusCode: 200,
        status: true,
        message: isS3Upload ? "Image uploaded successfully to S3" : "Image uploaded successfully to local storage"
      },
      data: {
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        isS3Upload,
        userId,
        uniqueId: uniqueKey
      }
    });
  } catch (error) {
    return res.status(500).json({
      meta: { statusCode: 500, status: false, message: "Image upload failed: " + error.message }
    });
  }
};

exports.uploadExperienceLetter = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        meta: { statusCode: 400, status: false, message: "No experience letter file uploaded" }
      });
    }

    const userId = req.body.userId;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      if (req.file.path && !req.file.location) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        meta: { statusCode: 400, status: false, message: "Valid User ID is required" }
      });
    }

    if (!req.file.mimetype.startsWith('image/')) {
      if (req.file.path && !req.file.location) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        meta: { statusCode: 400, status: false, message: "Invalid file type. Only image files are allowed." }
      });
    }

    const isS3Upload = !!req.file.location;
    const fileUrl = isS3Upload ? req.file.location :
      `${process.env.serverBaseUrl || 'http://localhost:5000'}/uploads/experienceletter/${req.file.filename}`;
    const s3Key = req.file.key || req.file.filename;
    const uniqueKey = `${Date.now()}_${uuidv4()}`;

    const employee = await Employee.findById(userId);
    if (!employee) {
      if (req.file.path && !req.file.location) fs.unlinkSync(req.file.path);
      return res.status(404).json({
        meta: { statusCode: 404, status: false, message: "Employee not found" }
      });
    }

    const existingExperienceIndex = employee.documents.findIndex(doc => doc.type === 'experienceletter');
    if (existingExperienceIndex !== -1) {
      const existingExperience = employee.documents[existingExperienceIndex];

      if (existingExperience.s3Key && isS3Upload) {
        try {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: config.get("AWS_S3_BUCKET_NAME"),
            Key: existingExperience.s3Key
          }));
        } catch (s3Error) {
          console.error("Error deleting previous experience letter from S3:", s3Error);
        }
      }
      else if (existingExperience.url && !isS3Upload) {
        const filename = existingExperience.url.split('/').pop();
        const filePath = path.join(__dirname, '../uploads/experienceletter', filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }

      employee.documents.splice(existingExperienceIndex, 1);
    }

    const newDocument = {
      type: 'experienceletter',
      url: fileUrl,
      name: req.file.originalname,
      size: req.file.size,
      uploadedAt: new Date(),
      s3Key: isS3Upload ? s3Key : undefined,
      uniqueId: uniqueKey
    };

    employee.documents.push(newDocument);

    await employee.save();

    return res.status(200).json({
      meta: {
        statusCode: 200,
        status: true,
        message: "Experience letter uploaded successfully"
      },
      data: {
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        isS3Upload,
        userId,
        uniqueId: uniqueKey
      }
    });

  } catch (error) {
    console.error("Experience letter upload failed:", error);
    if (req.file?.path && !req.file?.location) fs.unlinkSync(req.file.path);

    return res.status(500).json({
      meta: { statusCode: 500, status: false, message: "Experience letter upload failed: " + error.message }
    });
  }
};


exports.uploadCertificate = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        meta: { statusCode: 400, status: false, message: "No certificate file uploaded" }
      });
    }

    const userId = req.body.userId;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      if (req.file.path && !req.file.location) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        meta: { statusCode: 400, status: false, message: "Valid User ID is required" }
      });
    }

    if (!req.file.mimetype.startsWith('image/')) {
      if (req.file.path && !req.file.location) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        meta: { statusCode: 400, status: false, message: "Invalid file type. Only image files are allowed." }
      });
    }

    const isS3Upload = !!req.file.location;
    const fileUrl = isS3Upload ? req.file.location :
      `${process.env.serverBaseUrl || 'http://localhost:5000'}/uploads/certificate/${req.file.filename}`;
    const s3Key = req.file.key || req.file.filename;
    const uniqueKey = `${Date.now()}_${uuidv4()}`;

    const employee = await Employee.findById(userId);
    if (!employee) {
      if (req.file.path && !req.file.location) fs.unlinkSync(req.file.path);
      return res.status(404).json({
        meta: { statusCode: 404, status: false, message: "Employee not found" }
      });
    }

    const existingCertificateIndex = employee.documents.findIndex(doc => doc.type === 'certificate');
    if (existingCertificateIndex !== -1) {
      const existingCertificate = employee.documents[existingCertificateIndex];

      if (existingCertificate.s3Key && isS3Upload) {
        try {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: config.get("AWS_S3_BUCKET_NAME"),
            Key: existingCertificate.s3Key
          }));
        } catch (s3Error) {
          console.error("Error deleting previous certificate from S3:", s3Error);
        }
      }
      else if (existingCertificate.url && !isS3Upload) {
        const filename = existingCertificate.url.split('/').pop();
        const filePath = path.join(__dirname, '../uploads/certificate', filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }

      employee.documents.splice(existingCertificateIndex, 1);
    }

    const newDocument = {
      type: 'certificate',
      url: fileUrl,
      name: req.file.originalname,
      size: req.file.size,
      uploadedAt: new Date(),
      s3Key: isS3Upload ? s3Key : undefined,
      uniqueId: uniqueKey
    };

    employee.documents.push(newDocument);

    await employee.save();

    return res.status(200).json({
      meta: {
        statusCode: 200,
        status: true,
        message: "Certificate uploaded successfully"
      },
      data: {
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        isS3Upload,
        userId,
        uniqueId: uniqueKey
      }
    });

  } catch (error) {
    console.error("Certificate upload failed:", error);
    if (req.file?.path && !req.file?.location) fs.unlinkSync(req.file.path);

    return res.status(500).json({
      meta: { statusCode: 500, status: false, message: "Certificate upload failed: " + error.message }
    });
  }
};


exports.getEmployeeDocuments = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        meta: { statusCode: 400, status: false, message: "User ID is required" }
      });
    }

    const employee = await Employee.findById(userId);

    if (!employee) {
      return res.status(404).json({
        meta: { statusCode: 404, status: false, message: "Employee not found" }
      });
    }

    const documents = employee.documents || [];

    return res.status(200).json({
      meta: {
        statusCode: 200,
        status: true,
        message: "Documents retrieved successfully",
        count: documents.length
      },
      data: documents
    });
  } catch (error) {
    return res.status(500).json({
      meta: { statusCode: 500, status: false, message: "Error retrieving documents: " + error.message }
    });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const { userId, documentId, documentType } = req.params;

    if (!userId || !documentId || !documentType) {
      return res.status(400).json({
        meta: { statusCode: 400, status: false, message: "User ID, Document ID, and Document Type are required" }
      });
    }

    const employee = await Employee.findById(userId);

    if (!employee) {
      return res.status(404).json({
        meta: { statusCode: 404, status: false, message: "Employee not found" }
      });
    }

    const documentIndex = employee.documents.findIndex(
      doc => doc._id.toString() === documentId && doc.type === documentType
    );

    if (documentIndex === -1) {
      return res.status(404).json({
        meta: { statusCode: 404, status: false, message: `${documentType} not found` }
      });
    }

    const document = employee.documents[documentIndex];

    if (document.s3Key && document.s3Key.includes('/')) {
      try {
        await s3.deleteObject({
          Bucket: config.get("AWS_S3_BUCKET_NAME"),
          Key: document.s3Key
        }).promise();
      } catch (s3Error) {
        console.error(`Error deleting ${documentType} from S3:`, s3Error);
      }
    }

    employee.documents.splice(documentIndex, 1);
    await employee.save();

    return res.status(200).json({
      meta: { statusCode: 200, status: true, message: `${documentType} deleted successfully` }
    });
  } catch (error) {
    return res.status(500).json({
      meta: { statusCode: 500, status: false, message: `Error deleting ${documentType}: ${error.message}` }
    });
  }
};

// exports.deleteExperienceLetter = async (req, res) => {

//   try {
//     const { userId } = req.params;

//     if (!userId) {
//       return res.status(400).json({
//         meta: { statusCode: 400, status: false, message: "User ID is required" }
//       });
//     }

//     const employee = await Employee.findById(userId);

//     if (!employee) {
//       return res.status(404).json({
//         meta: { statusCode: 404, status: false, message: "Employee not found" }
//       });
//     }

//     const expLetterIndex = employee.documents.findIndex(
//       doc => doc.type === 'experienceletter'
//     );

//     if (expLetterIndex === -1) {
//       return res.status(404).json({
//         meta: { statusCode: 404, status: false, message: "Experience letter not found" }
//       });
//     }

//     const document = employee.documents[expLetterIndex];

//     // Delete from S3 if it exists there
//     if (document.s3Key && document.s3Key.includes('/')) {
//       try {
//         await s3.deleteObject({
//           Bucket: config.get("AWS_S3_BUCKET_NAME"),
//           Key: document.s3Key
//         }).promise();
//       } catch (s3Error) {
//         console.error("Error deleting file from S3:", s3Error);
//       }
//     }

//     employee.documents.splice(expLetterIndex, 1);
//     await employee.save();

//     return res.status(200).json({
//       meta: { statusCode: 200, status: true, message: "Experience letter deleted successfully" }
//     });
//   } catch (error) {
//     return res.status(500).json({
//       meta: { statusCode: 500, status: false, message: "Error deleting experience letter: " + error.message }
//     });
//   }
// };


exports.uploadCompanyProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        meta: { statusCode: 400, status: false, message: "No profile image uploaded" }
      });
    }

    const { companyRefId } = req.body;
    if (!companyRefId) {
      if (req.file.path && !req.file.location) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        meta: { statusCode: 400, status: false, message: "Valid Company RefId is required" }
      });
    }

    if (!req.file.mimetype.startsWith('image/')) {
      if (req.file.path && !req.file.location) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        meta: { statusCode: 400, status: false, message: "Invalid file type. Only image files are allowed." }
      });
    }

    const isS3Upload = !!req.file.location;
    const fileUrl = isS3Upload ? req.file.location :
      `${process.env.serverBaseUrl || 'http://localhost:5000'}/uploads/companyprofileimages/${req.file.filename}`;
    const s3Key = req.file.key || req.file.filename;
    const uniqueKey = `${Date.now()}_${uuidv4()}`;

    const company = await Company.findOne({ companyRefId });
    if (!company) {
      if (req.file.path && !req.file.location) fs.unlinkSync(req.file.path);
      return res.status(404).json({
        meta: { statusCode: 404, status: false, message: "Company not found" }
      });
    }

    if (company.companyProfileImage) {
      const previousImageS3Key = company.companyProfileImage.split('/').pop();

      try {
        if (previousImageS3Key && isS3Upload) {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: config.get("AWS_S3_BUCKET_NAME"),
            Key: previousImageS3Key
          }));
        } else if (previousImageS3Key && !isS3Upload) {
          const previousImagePath = path.join(__dirname, '../uploads/companyprofileimages', previousImageS3Key);
          if (fs.existsSync(previousImagePath)) fs.unlinkSync(previousImagePath);
        }
      } catch (error) {
        console.error("Error deleting previous profile image from S3:", error);
      }
    }

    company.companyProfileImage = fileUrl;
    await company.save();

    return res.status(200).json({
      meta: {
        statusCode: 200,
        status: true,
        message: "Company profile image uploaded successfully"
      },
      data: {
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        isS3Upload,
        companyRefId,
        uniqueId: uniqueKey
      }
    });

  } catch (error) {
    console.error("Error uploading company profile image:", error);
    if (req.file?.path && !req.file?.location) fs.unlinkSync(req.file.path);
    return res.status(500).json({
      meta: { statusCode: 500, status: false, message: "Profile image upload failed: " + error.message }
    });
  }
};
