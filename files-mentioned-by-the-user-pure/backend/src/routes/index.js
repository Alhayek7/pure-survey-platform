const router = require('express').Router();
router.use('/v1/auth', require('./v1/auth.routes'));
router.use('/v1/surveys', require('./v1/surveys.routes'));
router.use('/v1/responses', require('./v1/responses.routes'));
router.use('/v1/export', require('./v1/export.routes'));
router.use('/v1/users', require('./v1/users.routes'));
module.exports = router;
