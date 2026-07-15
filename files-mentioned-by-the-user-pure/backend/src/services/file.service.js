const path = require('path');
const { Attachment } = require('../models');
async function saveUploadedFile(file, userId) { return Attachment.create({ original_name: file.originalname, stored_name: file.filename, file_path: path.join('uploads', file.filename), mime_type: file.mimetype, file_size: file.size, uploaded_by: userId || null }); }
module.exports = { saveUploadedFile };
