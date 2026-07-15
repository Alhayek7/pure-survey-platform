const ROLES = Object.freeze({ ADMIN: 'admin', RESEARCHER: 'researcher', USER: 'user' });
const SURVEY_STATUS = Object.freeze({ DRAFT: 'draft', PUBLISHED: 'published', CLOSED: 'closed' });
const QUESTION_TYPES = ['short_text','long_text','multiple_choice','checkboxes','rating','dropdown','date','number','file_upload'];
const ALLOWED_UPLOAD_MIME = ['image/jpeg','image/png','image/webp','application/pdf'];
module.exports = { ROLES, SURVEY_STATUS, QUESTION_TYPES, ALLOWED_UPLOAD_MIME };
