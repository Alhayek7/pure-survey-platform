/**
 * Survey Routes
 * Handles all survey-related operations
 * 
 * @module routes/survey.routes
 * @requires express
 * @requires ../controllers/survey.controller
 * @requires ../middleware/auth
 * @requires ../middleware/rateLimit
 * @requires ../middleware/recaptcha
 */

const express = require('express');
const router = express.Router();

const surveyController = require('../controllers/survey.controller');
const { authenticate, requireAdminOrResearcher, requireOwnerOrAdmin } = require('../middleware/auth');
const { generalLimiter, surveyLimiter, responseLimiter } = require('../middleware/rateLimit');
const { surveyRecaptchaMiddleware } = require('../middleware/recaptcha');

// ============================================
// Public Routes (No Authentication Required)
// ============================================

/**
 * @route   GET /api/v1/surveys/public
 * @desc    Get all published surveys for public access
 * @access  Public
 */
router.get('/public', surveyController.getPublishedSurveys);

/**
 * @route   GET /api/v1/surveys/public/:id
 * @desc    Get single published survey by ID
 * @access  Public
 */
router.get('/public/:id', surveyController.getPublishedSurveyById);

// ============================================
// Protected Routes (Authentication Required)
// ============================================

/**
 * @route   GET /api/v1/surveys/my
 * @desc    Get surveys created by authenticated user
 * @access  Private
 */
router.get('/my', authenticate, surveyController.getMySurveys);

/**
 * @route   GET /api/v1/surveys
 * @desc    Get all surveys (Admin only)
 * @access  Private/Admin
 */
router.get('/', authenticate, surveyController.getAllSurveys);

/**
 * @route   GET /api/v1/surveys/:id
 * @desc    Get single survey by ID
 * @access  Private (Owner or Admin)
 */
router.get('/:id', authenticate, surveyController.getSurveyById);

/**
 * @route   POST /api/v1/surveys
 * @desc    Create new survey
 * @access  Private (Researcher or Admin)
 */
router.post(
    '/',
    authenticate,
    requireAdminOrResearcher,
    surveyLimiter,
    surveyRecaptchaMiddleware,
    surveyController.createSurvey
);

/**
 * @route   PUT /api/v1/surveys/:id
 * @desc    Update survey
 * @access  Private (Owner or Admin)
 */
router.put(
    '/:id',
    authenticate,
    requireOwnerOrAdmin(async (req) => {
        const survey = await require('../models/survey.model').findByPk(req.params.id);
        return survey?.user_id;
    }),
    generalLimiter,
    surveyController.updateSurvey
);

/**
 * @route   DELETE /api/v1/surveys/:id
 * @desc    Delete survey (soft delete)
 * @access  Private (Owner or Admin)
 */
router.delete(
    '/:id',
    authenticate,
    requireOwnerOrAdmin(async (req) => {
        const survey = await require('../models/survey.model').findByPk(req.params.id);
        return survey?.user_id;
    }),
    surveyController.deleteSurvey
);

/**
 * @route   POST /api/v1/surveys/:id/publish
 * @desc    Publish survey (make it public)
 * @access  Private (Owner or Admin)
 */
router.post(
    '/:id/publish',
    authenticate,
    requireOwnerOrAdmin(async (req) => {
        const survey = await require('../models/survey.model').findByPk(req.params.id);
        return survey?.user_id;
    }),
    surveyController.publishSurvey
);

/**
 * @route   POST /api/v1/surveys/:id/close
 * @desc    Close survey (stop accepting responses)
 * @access  Private (Owner or Admin)
 */
router.post(
    '/:id/close',
    authenticate,
    requireOwnerOrAdmin(async (req) => {
        const survey = await require('../models/survey.model').findByPk(req.params.id);
        return survey?.user_id;
    }),
    surveyController.closeSurvey
);

/**
 * @route   POST /api/v1/surveys/:id/duplicate
 * @desc    Duplicate existing survey
 * @access  Private (Researcher or Admin)
 */
router.post(
    '/:id/duplicate',
    authenticate,
    requireAdminOrResearcher,
    surveyLimiter,
    surveyController.duplicateSurvey
);

// ============================================
// Survey Statistics
// ============================================

/**
 * @route   GET /api/v1/surveys/:id/stats
 * @desc    Get survey statistics (responses count, completion rate, etc.)
 * @access  Private (Owner or Admin)
 */
router.get(
    '/:id/stats',
    authenticate,
    requireOwnerOrAdmin(async (req) => {
        const survey = await require('../models/survey.model').findByPk(req.params.id);
        return survey?.user_id;
    }),
    surveyController.getSurveyStats
);

/**
 * @route   GET /api/v1/surveys/:id/responses/export
 * @desc    Export survey responses to CSV/Excel
 * @access  Private (Owner or Admin)
 */
router.get(
    '/:id/responses/export',
    authenticate,
    requireOwnerOrAdmin(async (req) => {
        const survey = await require('../models/survey.model').findByPk(req.params.id);
        return survey?.user_id;
    }),
    surveyController.exportSurveyResponses
);

// ============================================
// Survey Responses Management
// ============================================

/**
 * @route   GET /api/v1/surveys/:id/responses
 * @desc    Get all responses for a survey
 * @access  Private (Owner or Admin)
 */
router.get(
    '/:id/responses',
    authenticate,
    requireOwnerOrAdmin(async (req) => {
        const survey = await require('../models/survey.model').findByPk(req.params.id);
        return survey?.user_id;
    }),
    surveyController.getSurveyResponses
);

/**
 * @route   DELETE /api/v1/surveys/:id/responses/:responseId
 * @desc    Delete specific response from survey
 * @access  Private (Owner or Admin)
 */
router.delete(
    '/:id/responses/:responseId',
    authenticate,
    requireOwnerOrAdmin(async (req) => {
        const survey = await require('../models/survey.model').findByPk(req.params.id);
        return survey?.user_id;
    }),
    surveyController.deleteResponse
);

// ============================================
// Survey Templates
// ============================================

/**
 * @route   GET /api/v1/surveys/templates
 * @desc    Get survey templates
 * @access  Private
 */
router.get('/templates', authenticate, surveyController.getSurveyTemplates);

/**
 * @route   POST /api/v1/surveys/templates/:templateId/create
 * @desc    Create survey from template
 * @access  Private (Researcher or Admin)
 */
router.post(
    '/templates/:templateId/create',
    authenticate,
    requireAdminOrResearcher,
    surveyLimiter,
    surveyController.createFromTemplate
);

// ============================================
// Survey Analytics (Advanced)
// ============================================

/**
 * @route   GET /api/v1/surveys/:id/analytics/sentiment
 * @desc    Get sentiment analysis of text responses
 * @access  Private (Owner or Admin)
 */
router.get(
    '/:id/analytics/sentiment',
    authenticate,
    requireOwnerOrAdmin(async (req) => {
        const survey = await require('../models/survey.model').findByPk(req.params.id);
        return survey?.user_id;
    }),
    surveyController.getSentimentAnalysis
);

/**
 * @route   GET /api/v1/surveys/:id/analytics/insights
 * @desc    Get AI-powered insights from responses
 * @access  Private (Owner or Admin)
 */
router.get(
    '/:id/analytics/insights',
    authenticate,
    requireOwnerOrAdmin(async (req) => {
        const survey = await require('../models/survey.model').findByPk(req.params.id);
        return survey?.user_id;
    }),
    surveyController.getAIInsights
);

// ============================================
// Bulk Operations (Admin only)
// ============================================

/**
 * @route   DELETE /api/v1/surveys/batch
 * @desc    Delete multiple surveys
 * @access  Private/Admin
 */
router.delete('/batch', authenticate, surveyController.batchDeleteSurveys);

/**
 * @route   POST /api/v1/surveys/batch/publish
 * @desc    Publish multiple surveys
 * @access  Private/Admin
 */
router.post('/batch/publish', authenticate, surveyController.batchPublishSurveys);

// ============================================
// Module Exports
// ============================================

module.exports = router;