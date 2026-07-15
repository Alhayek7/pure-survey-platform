/**
 * Logger Configuration
 * Winston logging system for application-wide logging
 * 
 * @module config/logger
 * @requires winston
 * @requires winston-daily-rotate-file
 * @requires path
 * @requires fs
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// ============================================
// Create logs directory if it doesn't exist
// ============================================

const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// ============================================
// Log Formats
// ============================================

/**
 * Custom format for console output (development)
 */
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        let log = `${timestamp} ${level}: ${message}`;
        
        if (Object.keys(meta).length > 0) {
            log += `\n  └─ ${JSON.stringify(meta, null, 2)}`;
        }
        
        if (stack) {
            log += `\n  └─ Stack: ${stack}`;
        }
        
        return log;
    })
);

/**
 * JSON format for file output (production)
 */
const jsonFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

/**
 * Simple format for daily rotate files
 */
const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return JSON.stringify({
            timestamp,
            level,
            message,
            ...meta
        });
    })
);

// ============================================
// Transport Configurations
// ============================================

/**
 * Console transport (development)
 */
const consoleTransport = new winston.transports.Console({
    level: process.env.LOG_LEVEL || 'info',
    format: consoleFormat,
    handleExceptions: true,
    handleRejections: true
});

/**
 * Daily rotate file transport - Combined logs
 */
const combinedRotateTransport = new DailyRotateFile({
    filename: path.join(logsDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    level: 'info',
    format: fileFormat,
    zippedArchive: true
});

/**
 * Daily rotate file transport - Error logs only
 */
const errorRotateTransport = new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error',
    format: fileFormat,
    zippedArchive: true
});

/**
 * HTTP request log transport
 */
const httpTransport = new DailyRotateFile({
    filename: path.join(logsDir, 'http-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '50m',
    maxFiles: '7d',
    level: 'http',
    format: fileFormat
});

/**
 * Audit log transport (security events)
 */
const auditTransport = new DailyRotateFile({
    filename: path.join(logsDir, 'audit-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '90d',
    level: 'info',
    format: fileFormat
});

/**
 * Database query log transport
 */
const queryTransport = new DailyRotateFile({
    filename: path.join(logsDir, 'queries-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '50m',
    maxFiles: '7d',
    level: 'debug',
    format: fileFormat
});

// ============================================
// Create Winston Logger
// ============================================

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: jsonFormat,
    transports: [
        combinedRotateTransport,
        errorRotateTransport,
        httpTransport,
        auditTransport
    ],
    exceptionHandlers: [
        new DailyRotateFile({
            filename: path.join(logsDir, 'exceptions-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '30d',
            format: fileFormat
        })
    ],
    rejectionHandlers: [
        new DailyRotateFile({
            filename: path.join(logsDir, 'rejections-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '30d',
            format: fileFormat
        })
    ],
    exitOnError: false
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
    logger.add(consoleTransport);
}

// ============================================
// Custom Logging Methods
// ============================================

/**
 * Log HTTP request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {number} duration - Request duration in ms
 */
logger.httpLog = (req, res, duration) => {
    logger.http({
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        userId: req.user?.id
    });
};

/**
 * Log security event
 * @param {string} event - Security event type
 * @param {Object} details - Event details
 * @param {Object} req - Express request object
 */
logger.security = (event, details, req = null) => {
    const logData = {
        event,
        details,
        timestamp: new Date().toISOString(),
        ip: req?.ip,
        userId: req?.user?.id,
        userAgent: req?.get('user-agent')
    };
    
    logger.info(`SECURITY: ${event}`, logData);
    
    // Also write to audit transport
    auditTransport.write(JSON.stringify(logData) + '\n');
};

/**
 * Log database query
 * @param {string} query - SQL query
 * @param {Array} params - Query parameters
 * @param {number} duration - Query duration
 */
logger.dbQuery = (query, params, duration) => {
    if (process.env.NODE_ENV !== 'production') {
        logger.debug('Database Query', {
            query,
            params,
            duration: `${duration}ms`
        });
        
        queryTransport.write(JSON.stringify({
            timestamp: new Date().toISOString(),
            query,
            params,
            duration
        }) + '\n');
    }
};

/**
 * Log user action
 * @param {Object} user - User object
 * @param {string} action - Action performed
 * @param {Object} metadata - Additional metadata
 */
logger.userAction = (user, action, metadata = {}) => {
    logger.info(`USER_ACTION: ${action}`, {
        userId: user?.id,
        userEmail: user?.email,
        action,
        metadata,
        timestamp: new Date().toISOString()
    });
};

/**
 * Log API request/response
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Object} body - Response body
 * @param {number} duration - Duration
 */
logger.apiLog = (req, res, body, duration) => {
    const level = res.statusCode >= 400 ? 'error' : 'info';
    
    logger[level](`API ${req.method} ${req.originalUrl}`, {
        request: {
            method: req.method,
            url: req.originalUrl,
            query: req.query,
            body: req.body,
            headers: {
                'user-agent': req.get('user-agent'),
                'content-type': req.get('content-type')
            }
        },
        response: {
            status: res.statusCode,
            body: body,
            duration: `${duration}ms`
        },
        userId: req.user?.id,
        ip: req.ip
    });
};

// ============================================
// Child Logger for Modules
// ============================================

/**
 * Create child logger for specific module
 * @param {string} module - Module name
 * @returns {Object} Child logger
 */
logger.child = (module) => {
    return logger.child({ module });
};

// ============================================
// Log Cleanup Scheduler
// ============================================

/**
 * Clean up old log files (older than specified days)
 * @param {number} days - Number of days to keep
 */
logger.cleanupOldLogs = async (days = 30) => {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    try {
        // For Windows
        if (process.platform === 'win32') {
            const files = fs.readdirSync(logsDir);
            let deletedCount = 0;
            
            for (const file of files) {
                const filePath = path.join(logsDir, file);
                const stats = fs.statSync(filePath);
                
                if (stats.mtime < cutoffDate) {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                }
            }
            
            logger.info(`Cleaned up ${deletedCount} old log files`);
        } else {
            // For Linux/Mac
            const deleteCmd = `find ${logsDir} -name "*.log" -type f -mtime +${days} -delete`;
            await execPromise(deleteCmd);
            logger.info(`Cleaned up log files older than ${days} days`);
        }
    } catch (error) {
        logger.error('Failed to clean up old logs:', error);
    }
};

// Run cleanup once a week
setInterval(() => {
    logger.cleanupOldLogs(30);
}, 7 * 24 * 60 * 60 * 1000);

// ============================================
// Log Stats
// ============================================

/**
 * Get log statistics
 * @returns {Object} Log statistics
 */
logger.getLogStats = () => {
    try {
        const files = fs.readdirSync(logsDir);
        const logFiles = files.filter(f => f.endsWith('.log'));
        
        let totalSize = 0;
        const fileStats = [];
        
        for (const file of logFiles) {
            const filePath = path.join(logsDir, file);
            const stats = fs.statSync(filePath);
            totalSize += stats.size;
            fileStats.push({
                name: file,
                size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
                modified: stats.mtime
            });
        }
        
        return {
            totalFiles: logFiles.length,
            totalSize: (totalSize / 1024 / 1024).toFixed(2) + ' MB',
            directory: logsDir,
            files: fileStats
        };
    } catch (error) {
        return { error: error.message };
    }
};

// ============================================
// Module Exports
// ============================================

module.exports = logger;