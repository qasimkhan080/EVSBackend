const express = require("express");
const router = express.Router();
const uploadController = require('../controllers/upload.controller');
const upload = require("../middlewares/upload");

router.post('/banner', upload.banner.single('file'), uploadController.uploadBanner);

router.post('/profileimage', upload.profileImage.single('file'), uploadController.uploadProfileImage);

router.post("/resume", upload.pdf.single("file"), uploadController.uploadResume);

router.post("/experienceletter", upload.experienceLetter.single("file"), uploadController.uploadExperienceLetter);

router.post("/certificate", upload.certificate.single("file"), uploadController.uploadCertificate);

router.post("/education", upload.education.single("file"), uploadController.uploadEducation);

router.get("/documents/:userId", uploadController.getEmployeeDocuments);

router.delete("/document/:userId/:documentId", uploadController.deleteDocument);

router.post('/companyprofileimage', upload.companyProfileImage.single('file'), uploadController.uploadCompanyProfileImage);

module.exports = router;