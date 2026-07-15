const { Survey } = require('../models');
const { ROLES } = require('../utils/constants');
const requireRole = (...roles) => (req, res, next) => roles.includes(req.user?.role) ? next() : res.status(403).json({ message: 'Forbidden' });
const adminOnly = requireRole(ROLES.ADMIN);
const researcherOrAdmin = requireRole(ROLES.ADMIN, ROLES.RESEARCHER);
async function canModifySurvey(req, res, next) { const survey = await Survey.findByPk(req.params.id || req.params.surveyId); if (!survey) return res.status(404).json({ message: 'Survey not found' }); if (req.user.role === ROLES.ADMIN || survey.user_id === req.user.id) { req.survey = survey; return next(); } return res.status(403).json({ message: 'Forbidden' }); }
module.exports = { requireRole, adminOnly, researcherOrAdmin, canModifySurvey };
