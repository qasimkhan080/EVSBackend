const AWS = require('aws-sdk');

// Configure AWS with your access and secret key
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

module.exports = { s3 };

// 2. Create a new file: middleware/upload.js
const multer = require('multer');
const multerS3 = require('multer-s3');
const { s3 } = require('../config/aws');
const path = require('path');

// Set up multer with S3 storage
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET_NAME,
    acl: 'public-read',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const fileExtension = path.extname(file.originalname);
      cb(null, 'certifications/' + uniqueSuffix + fileExtension);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only images
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

module.exports = upload;