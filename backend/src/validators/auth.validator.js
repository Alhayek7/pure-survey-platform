const { body } = require('express-validator');
exports.registerRules = [body('name').trim().isLength({ min: 2, max: 100 }), body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 6 })];
exports.loginRules = [body('email').isEmail().normalizeEmail(), body('password').notEmpty()];
exports.profileRules = [body('name').optional().trim().isLength({ min: 2, max: 100 }), body('password').optional().isLength({ min: 6 })];
