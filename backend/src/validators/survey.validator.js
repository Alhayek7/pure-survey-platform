const { body } = require('express-validator');
const { QUESTION_TYPES } = require('../utils/constants');
exports.surveyRules = [body('title').trim().isLength({ min: 2, max: 200 }), body('description').optional({ nullable: true }).trim(), body('is_public').optional().isBoolean()];
exports.questionRules = [body('questions').isArray({ min: 1 }), body('questions.*.question_text').trim().notEmpty(), body('questions.*.question_type').isIn(QUESTION_TYPES), body('questions.*.order_number').isInt({ min: 1 }), body('questions.*.options').optional().isArray()];
