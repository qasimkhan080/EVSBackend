const multer = require("multer");
const fs = require("fs");
const path = require("path");
const AWS = require("aws-sdk");
const multerS3 = require("multer-s3");
const config = require("config");

const uploadDir = path.join(__dirname, "../uploads");
const pdfUploadDir = path.join(__dirname, "../uploads/resume");
const experienceLetterDir = path.join(__dirname, "../uploads/experienceletter");
const educationDir = path.join(__dirname, "../uploads/education");
const certificateDir = path.join(__dirname, "../uploads/certificate");
const profileImageDir = path.join(__dirname, "../uploads/profileimages");
const companyProfileImageDir = path.join(__dirname, "../uploads/companyprofileimages");  // Changed directory for company profile images

[uploadDir, pdfUploadDir, experienceLetterDir, educationDir, certificateDir, profileImageDir, companyProfileImageDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

let s3;
let useS3 = false;

try {
    const AWS_ACCESS_KEY = config.get("AWS_ACCESS_KEY");
    const AWS_SECRET_KEY = config.get("AWS_SECRET_KEY");
    const AWS_REGION = config.get("AWS_REGION") || "eu-north-1";
    const AWS_S3_BUCKET_NAME = config.get("AWS_S3_BUCKET_NAME") || "evswebsitebucket";

    if (AWS_ACCESS_KEY && AWS_SECRET_KEY && AWS_S3_BUCKET_NAME) {
        useS3 = true;
        s3 = new AWS.S3({
            accessKeyId: AWS_ACCESS_KEY,
            secretAccessKey: AWS_SECRET_KEY,
            region: AWS_REGION,
            signatureVersion: 'v4'
        });
    }
} catch (error) {
    console.log("Using local file storage:", error.message);
}

const s3KeyGen = (folder) => (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, `${folder}/${uniqueSuffix}${fileExtension}`);
};

const imageFileFilter = (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

const pdfFileFilter = (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
        return cb(new Error('Only PDF files are allowed!'), false);
    }
    cb(null, true);
};

const defaultStorage = useS3
    ? multerS3({
        s3,
        bucket: config.get("AWS_S3_BUCKET_NAME"),
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: s3KeyGen('uploads')
    })
    : multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
    });

    const bannerStorage = useS3
  ? multerS3({
      s3: s3,
      bucket: config.get("AWS_S3_BUCKET_NAME"),
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: s3KeyGen('banners')
    })
  : multer.diskStorage({
      destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/banners')),
      filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
    });


const profileImageStorage = useS3
    ? multerS3({
        s3,
        bucket: config.get("AWS_S3_BUCKET_NAME"),
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: s3KeyGen('profileimages')
    })
    : multer.diskStorage({
        destination: (req, file, cb) => cb(null, profileImageDir),
        filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
    });

const educationStorage = useS3
    ? multerS3({
        s3,
        bucket: config.get("AWS_S3_BUCKET_NAME"),
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: s3KeyGen('education')
    })
    : multer.diskStorage({
        destination: (req, file, cb) => cb(null, educationDir),
        filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
    });

const certificateStorage = useS3
    ? multerS3({
        s3,
        bucket: config.get("AWS_S3_BUCKET_NAME"),
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: s3KeyGen('certificate')
    })
    : multer.diskStorage({
        destination: (req, file, cb) => cb(null, certificateDir),
        filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
    });

const pdfStorage = useS3
    ? multerS3({
        s3,
        bucket: config.get("AWS_S3_BUCKET_NAME"),
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: s3KeyGen('resume')
    })
    : multer.diskStorage({
        destination: (req, file, cb) => cb(null, pdfUploadDir),
        filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
    });

const experienceLetterStorage = useS3
    ? multerS3({
        s3,
        bucket: config.get("AWS_S3_BUCKET_NAME"),
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: s3KeyGen('experienceletter')
    })
    : multer.diskStorage({
        destination: (req, file, cb) => cb(null, experienceLetterDir),
        filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
    });

    const companyProfileImageStorage = useS3
    ? multerS3({
        s3,
        bucket: config.get("AWS_S3_BUCKET_NAME"),
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: s3KeyGen('companyprofileimages') // Changed folder to 'companyprofileimages'
    })
    : multer.diskStorage({
        destination: (req, file, cb) => cb(null, companyProfileImageDir), // Corrected the directory path
        filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
    });


const upload = multer({ storage: defaultStorage });
upload.banner = multer({
    storage: bannerStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: imageFileFilter
  });
upload.profileImage = multer({
    storage: profileImageStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: imageFileFilter
});
upload.pdf = multer({
    storage: pdfStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: pdfFileFilter
});
upload.experienceLetter = multer({
    storage: experienceLetterStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: imageFileFilter
});
upload.education = multer({
    storage: educationStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: imageFileFilter
});
upload.certificate = multer({
    storage: certificateStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: imageFileFilter
});

upload.companyProfileImage = multer({
    storage: companyProfileImageStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: imageFileFilter
});

module.exports = upload;