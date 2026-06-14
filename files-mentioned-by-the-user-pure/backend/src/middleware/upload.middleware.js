const multer = require('multer');
const path = require('path');
const { ALLOWED_UPLOAD_MIME } = require('../utils/constants');
const storage = multer.diskStorage({ destination: (_req, _file, cb) => cb(null, path.join(__dirname, '../../uploads')), filename: (_req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random()*1e9) + path.extname(file.originalname).toLowerCase()) });
const upload = multer({ storage, limits: { fileSize: Number(process.env.MAX_FILE_SIZE_MB || 5) * 1024 * 1024 }, fileFilter: (_req, file, cb) => ALLOWED_UPLOAD_MIME.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid file type')) });
module.exports = upload;
