/**
 * Export Routes
 * Handles data export operations (Excel, CSV, PDF)
 * 
 * @module routes/export.routes
 * @requires express
 * @requires ../controllers/export.controller
 * @requires ../middleware/auth
 * @requires ../middleware/rateLimit
 */

const express = require('express');
const router = express.Router();

const exportController = require('../controllers/export.controller');
const { authenticate, requireAdminOrResearcher, requireAdmin } = require('../middleware/auth');
const { generalLimiter, strictLimiter } = require('../middleware/rateLimit');

// ============================================
// All export routes require authentication
// ============================================
router.use(authenticate);

// ============================================
// Survey Exports (Researcher or Admin)
// ============================================

/**
 * @route   GET /api/v1/export/survey/:surveyId
 * @desc    Export survey responses to Excel
 * @access  Private (Survey Owner or Admin)
 */
router.get(
    '/survey/:surveyId',
    requireAdminOrResearcher,
    generalLimiter,
    exportController.exportSurveyToExcel
);

/**
 * @route   GET /api/v1/export/survey/:surveyId/csv
 * @desc    Export survey responses to CSV
 * @access  Private (Survey Owner or Admin)
 */
router.get(
    '/survey/:surveyId/csv',
    requireAdminOrResearcher,
    generalLimiter,
    exportController.exportSurveyToCSV
);

/**
 * @route   GET /api/v1/export/survey/:surveyId/pdf
 * @desc    Export survey responses to PDF
 * @access  Private (Survey Owner or Admin)
 */
router.get(
    '/survey/:surveyId/pdf',
    requireAdminOrResearcher,
    generalLimiter,
    exportController.exportSurveyToPDF
);

/**
 * @route   GET /api/v1/export/survey/:surveyId/results
 * @desc    Export survey results summary
 * @access  Private (Survey Owner or Admin)
 */
router.get(
    '/survey/:surveyId/results',
    requireAdminOrResearcher,
    generalLimiter,
    exportController.exportSurveyResults
);

// ============================================
// Response Exports (Researcher or Admin)
// ============================================

/**
 * @route   GET /api/v1/export/response/:responseId
 * @desc    Export single response as PDF
 * @access  Private (Response Owner or Admin)
 */
router.get(
    '/response/:responseId',
    generalLimiter,
    exportController.exportResponseToPDF
);

/**
 * @route   GET /api/v1/export/responses/batch
 * @desc    Export multiple responses (selected IDs)
 * @access  Private (Admin)
 */
router.post(
    '/responses/batch',
    requireAdmin,
    strictLimiter,
    exportController.exportSelectedResponses
);

// ============================================
// Full System Exports (Admin only)
// ============================================

/**
 * @route   GET /api/v1/export/all
 * @desc    Export all surveys and responses (Admin only)
 * @access  Private/Admin
 */
router.get(
    '/all',
    requireAdmin,
    strictLimiter,
    exportController.exportAllData
);

/**
 * @route   GET /api/v1/export/all/users
 * @desc    Export all users data (Admin only)
 * @access  Private/Admin
 */
router.get(
    '/all/users',
    requireAdmin,
    strictLimiter,
    exportController.exportAllUsers
);

/**
 * @route   GET /api/v1/export/all/surveys
 * @desc    Export all surveys metadata (Admin only)
 * @access  Private/Admin
 */
router.get(
    '/all/surveys',
    requireAdmin,
    strictLimiter,
    exportController.exportAllSurveys
);

/**
 * @route   GET /api/v1/export/all/responses
 * @desc    Export all responses across all surveys (Admin only)
 * @access  Private/Admin
 */
router.get(
    '/all/responses',
    requireAdmin,
    strictLimiter,
    exportController.exportAllResponses
);

/**
 * @route   GET /api/v1/export/backup
 * @desc    Export full database backup (Admin only)
 * @access  Private/Admin
 */
router.get(
    '/backup',
    requireAdmin,
    strictLimiter,
    exportController.exportDatabaseBackup
);

// ============================================
// Scheduled Exports (Admin only)
// ============================================

/**
 * @route   POST /api/v1/export/schedule
 * @desc    Schedule automated export
 * @access  Private/Admin
 */
router.post(
    '/schedule',
    requireAdmin,
    generalLimiter,
    exportController.scheduleExport
);

/**
 * @route   GET /api/v1/export/schedule
 * @desc    Get scheduled exports list
 * @access  Private/Admin
 */
router.get(
    '/schedule',
    requireAdmin,
    exportController.getScheduledExports
);

/**
 * @route   DELETE /api/v1/export/schedule/:scheduleId
 * @desc    Cancel scheduled export
 * @access  Private/Admin
 */
router.delete(
    '/schedule/:scheduleId',
    requireAdmin,
    exportController.cancelScheduledExport
);

/**
 * @route   GET /api/v1/export/history
 * @desc    Get export history
 * @access  Private/Admin
 */
router.get(
    '/history',
    requireAdmin,
    exportController.getExportHistory
);

// ============================================
// Analytics Exports (Admin only)
// ============================================

/**
 * @route   GET /api/v1/export/analytics/summary
 * @desc    Export analytics summary report
 * @access  Private/Admin
 */
router.get(
    '/analytics/summary',
    requireAdmin,
    generalLimiter,
    exportController.exportAnalyticsSummary
);

/**
 * @route   GET /api/v1/export/analytics/daily
 * @desc    Export daily analytics report
 * @access  Private/Admin
 */
router.get(
    '/analytics/daily',
    requireAdmin,
    generalLimiter,
    exportController.exportDailyAnalytics
);

/**
 * @route   GET /api/v1/export/analytics/monthly
 * @desc    Export monthly analytics report
 * @access  Private/Admin
 */
router.get(
    '/analytics/monthly',
    requireAdmin,
    generalLimiter,
    exportController.exportMonthlyAnalytics
);

// ============================================
// Export Formats and Options
// ============================================

/**
 * @route   GET /api/v1/export/formats
 * @desc    Get available export formats
 * @access  Private
 */
router.get(
    '/formats',
    exportController.getExportFormats
);

/**
 * @route   POST /api/v1/export/custom
 * @desc    Custom export with selected fields and filters
 * @access  Private (Admin or Researcher)
 */
router.post(
    '/custom',
    requireAdminOrResearcher,
    generalLimiter,
    exportController.customExport
);

// ============================================
// Export Templates
// ============================================

/**
 * @route   GET /api/v1/export/templates
 * @desc    Get export templates
 * @access  Private/Admin
 */
router.get(
    '/templates',
    requireAdmin,
    exportController.getExportTemplates
);

/**
 * @route   POST /api/v1/export/templates
 * @desc    Save export template
 * @access  Private/Admin
 */
router.post(
    '/templates',
    requireAdmin,
    generalLimiter,
    exportController.saveExportTemplate
);

/**
 * @route   DELETE /api/v1/export/templates/:templateId
 * @desc    Delete export template
 * @access  Private/Admin
 */
router.delete(
    '/templates/:templateId',
    requireAdmin,
    exportController.deleteExportTemplate
);

// ============================================
// Download Previously Exported Files
// ============================================

/**
 * @route   GET /api/v1/export/download/:fileId
 * @desc    Download previously exported file
 * @access  Private
 */
router.get(
    '/download/:fileId',
    exportController.downloadExportedFile
);

// ============================================
// Module Exports
// ============================================

module.exports = router;