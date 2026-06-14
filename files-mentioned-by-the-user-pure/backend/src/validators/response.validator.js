const { body } = require('express-validator');
exports.responseRules = [body('survey_id').isInt({ min: 1 }), body('answers').isArray({ min: 1 }), body('answers.*.question_id').isInt({ min: 1 }), body('answers.*.answer_value').exists()];
