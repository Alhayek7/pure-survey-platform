/**
 * Response Routes
 * Handles all survey response submissions and management
 * 
 * @module routes/response.routes
 * @requires express
 * @requires ../controllers/response.controller
 * @requires ../middleware/auth
 * @requires ../middleware/rateLimit
 * @requires ../middleware/recaptcha
 */

const express = require('express');
const router = express.Router();

const responseController = require('../controllers/response.controller');
const { authenticate, requireAdminOrResearcher, requireOwnerOrAdmin } = require('../middleware/auth');
const { responseLimiter, generalLimiter, strictLimiter } = require('../middleware/rateLimit');
const { surveyRecaptchaMiddleware } = require('../middleware/recaptcha');

// ============================================
// Public Routes (No Authentication Required)
// ============================================

/**
 * @route   POST /api/v1/responses
 * @desc    Submit a response to a survey (public)
 * @access  Public (but protected by rate limit and reCAPTCHA)
 */
router.post(
    '/',
    responseLimiter,
    surveyRecaptchaMiddleware,
    responseController.submitResponse
);

/**
 * @route   GET /api/v1/responses/verify/:token
 * @desc    Verify response token (for email verification)
 * @access  Public
 */
router.get('/verify/:token', responseController.verifyResponseToken);

// ============================================
// Protected Routes (Authentication Required)
// ============================================

/**
 * @route   GET /api/v1/responses/my
 * @desc    Get current user's responses
 * @access  Private
 */
router.get('/my', authenticate, responseController.getMyResponses);

/**
 * @route   GET /api/v1/responses/:id
 * @desc    Get single response by ID
 * @access  Private (Owner or Admin)
 */
router.get(
    '/:id',
    authenticate,
    requireOwnerOrAdmin(async (req) => {
        const response = await require('../models/response.model').findByPk(req.params.id);
        return response?.user_id;
    }),
    responseController.getResponseById
);

/**
 * @route   GET /api/v1/responses/survey/:surveyId
 * @desc    Get all responses for a specific survey
 * @access  Private (Survey Owner or Admin)
 */
router.get(
    '/survey/:surveyId',
    authenticate,
    requireOwnerOrAdmin(async (req) => {
        const survey = await require('../models/survey.model').findByPk(req.params.surveyId);
        return survey?.user_id;
    }),
    responseController.getSurveyResponses
);

/**
 * @route   PUT /api/v1/responses/:id
 * @desc    Update a response (limited to own responses within time limit)
 * @access  Private (Owner)
 */
router.put(
    '/:id',
    authenticate,
    requireOwnerOrAdmin(async (req) => {
        const response = await require('../models/response.model').findByPk(req.params.id);
        return response?.user_id;
    }),
    generalLimiter,
    responseController.updateResponse
);

/**
 * @route   DELETE /api/v1/responses/:id
 * @desc    Delete a response (soft delete)
 * @access  Private (Owner or Admin)
 */
router.delete(
    '/:id',
    authenticate,
    requireOwnerOrAdmin(async (req) => {
        const response = await require('../models/response.model').findByPk(req.params.id);
        return response?.user_id;
    }),
    responseController.deleteResponse
);

// ============================================
// Response Analytics
// ============================================

/**
 * @route   GET /api/v1/responses/survey/:surveyId/stats
 * @desc    Get response statistics for a survey
 * @access  Private (Survey Owner or Admin)
 */
router.get(
    '/survey/:surveyId/stats',
    authenticate,
    requireOwnerOrAdmin(async (req) => {
        const survey = await require('../models/survey.model').findByPk(req.params.surveyId);
        return survey?.user_id;
    }),
    responseController.getResponseStats
);

/**
 * @route   GET /api/v1/responses/survey/:surveyId/export
 * @desc    Export responses to Excel/CSV
 * @access  Private (Survey Owner or Admin)
 */
router.get(
    '/survey/:surveyId/export',
    authenticate,
    requireOwnerOrAdmin(async (req) => {
        const survey = await require('../models/survey.model').findByPk(req.params.surveyId);
        return survey?.user_id;
    }),
    responseController.exportResponses
);

/**
 * @route   GET /api/v1/responses/survey/:surveyId/analytics
 * @desc    Get advanced analytics for survey responses
 * @access  Private (Survey Owner or Admin)
 */
router.get(
    '/survey/:surveyId/analytics',
    authenticate,
    requireOwnerOrAdmin(async (req) => {
        const survey = await require('../models/survey.model').findByPk(req.params.surveyId);
        return survey?.user_id;
    }),
    responseController.getResponseAnalytics
);

// ============================================
// Response Management (Admin only)
// ============================================

/**
 * @route   GET /api/v1/responses/admin/all
 * @desc    Get all responses across all surveys (Admin only)
 * @access  Private/Admin
 */
router.get('/admin/all', authenticate, responseController.getAllResponsesAdmin);

/**
 * @route   DELETE /api/v1/responses/batch
 * @desc    Delete multiple responses (Admin only)
 * @access  Private/Admin
 */
router.delete('/batch', authenticate, responseController.batchDeleteResponses);

/**
 * @route   POST /api/v1/responses/batch/export
 * @desc    Export multiple responses from multiple surveys (Admin only)
 * @access  Private/Admin
 */
router.post('/batch/export', authenticate, responseController.batchExportResponses);

// ============================================
// Response Comments & Feedback
// ============================================

/**
 * @route   POST /api/v1/responses/:id/feedback
 * @desc    Add feedback or comment to a response
 * @access  Private (Admin only)
 */
router.post(
    '/:id/feedback',
    authenticate,
    responseController.addResponseFeedback
);

/**
 * @route   GET /api/v1/responses/:id/feedback
 * @desc    Get feedback for a response
 * @access  Private (Admin or Response Owner)
 */
router.get(
    '/:id/feedback',
    authenticate,
    requireOwnerOrAdmin(async (req) => {
        const response = await require('../models/response.model').findByPk(req.params.id);
        return response?.user_id;
    }),
    responseController.getResponseFeedback
);

// ============================================
// Response Attachments
// ============================================

/**
 * @route   GET /api/v1/responses/:id/attachments
 * @desc    Get attachments for a response
 * @access  Private (Owner or Admin)
 */
router.get(
    '/:id/attachments',
    authenticate,
    requireOwnerOrAdmin(async (req) => {
        const response = await require('../models/response.model').findByPk(req.params.id);
        return response?.user_id;
    }),
    responseController.getResponseAttachments
);

/**
 * @route   DELETE /api/v1/responses/:id/attachments/:attachmentId
 * @desc    Delete specific attachment
 * @access  Private (Owner or Admin)
 */
router.delete(
    '/:id/attachments/:attachmentId',
    authenticate,
    requireOwnerOrAdmin(async (req) => {
        const response = await require('../models/response.model').findByPk(req.params.id);
        return response?.user_id;
    }),
    responseController.deleteAttachment
);

// ============================================
// Response Notifications
// ============================================

/**
 * @route   POST /api/v1/responses/:id/notify
 * @desc    Send notification about a response
 * @access  Private (Admin or Survey Owner)
 */
router.post(
    '/:id/notify',
    authenticate,
    responseController.sendResponseNotification
);

// ============================================
// Module Exports
// ============================================

module.exports = router;