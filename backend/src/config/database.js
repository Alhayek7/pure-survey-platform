/**
 * Database Configuration
 * Sequelize configuration for PostgreSQL database
 * 
 * @module config/database
 * @requires sequelize
 * @requires dotenv
 */

const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// ============================================
// Database Configuration Object
// ============================================

const dbConfig = {
    development: {
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'pure_survey',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        dialect: 'postgres',
        logging: console.log,
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        define: {
            underscored: true,
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            deletedAt: 'deleted_at',
            paranoid: true
        }
    },
    production: {
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 5432,
        dialect: 'postgres',
        logging: false,
        pool: {
            max: 20,
            min: 5,
            acquire: 60000,
            idle: 10000
        },
        define: {
            underscored: true,
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            deletedAt: 'deleted_at',
            paranoid: true
        },
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    },
    test: {
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: `${process.env.DB_NAME || 'pure_survey'}_test`,
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        dialect: 'postgres',
        logging: false,
        define: {
            underscored: true,
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            deletedAt: 'deleted_at',
            paranoid: true
        }
    }
};

// ============================================
// Environment Selection
// ============================================

const env = process.env.NODE_ENV || 'development';
const config = dbConfig[env];

// ============================================
// Initialize Sequelize
// ============================================

const sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    {
        host: config.host,
        port: config.port,
        dialect: config.dialect,
        logging: config.logging,
        pool: config.pool,
        define: config.define,
        dialectOptions: config.dialectOptions,
        retry: {
            max: 3,
            match: [
                /SequelizeConnectionError/,
                /SequelizeConnectionRefusedError/,
                /SequelizeHostNotFoundError/,
                /SequelizeHostNotReachableError/,
                /SequelizeInvalidConnectionError/,
                /SequelizeConnectionTimedOutError/
            ],
            backoffBase: 1000,
            backoffExponent: 1.5
        }
    }
);

// ============================================
// Database Connection Test Function
// ============================================

/**
 * Test database connection
 * @returns {Promise<boolean>}
 */
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('✓ Database connection established successfully');
        console.log(`✓ Database: ${config.database}`);
        console.log(`✓ Host: ${config.host}:${config.port}`);
        console.log(`✓ Environment: ${env}`);
        return true;
    } catch (error) {
        console.error('✗ Unable to connect to database:', error.message);
        return false;
    }
};

// ============================================
// Database Synchronization (Development only)
// ============================================

/**
 * Sync database schema
 * @param {Object} options - Sync options
 * @returns {Promise<void>}
 */
const syncDatabase = async (options = {}) => {
    const { alter = false, force = false } = options;
    
    if (env === 'production' && force) {
        throw new Error('Cannot force sync in production!');
    }
    
    try {
        await sequelize.sync({ alter, force });
        console.log(`✓ Database synchronized (alter: ${alter}, force: ${force})`);
    } catch (error) {
        console.error('✗ Database sync failed:', error.message);
        throw error;
    }
};

// ============================================
// Close Database Connection
// ============================================

/**
 * Close database connection
 * @returns {Promise<void>}
 */
const closeConnection = async () => {
    try {
        await sequelize.close();
        console.log('✓ Database connection closed');
    } catch (error) {
        console.error('✗ Error closing database connection:', error.message);
    }
};

// ============================================
// Health Check Function
// ============================================

/**
 * Get database health status
 * @returns {Promise<Object>}
 */
const getHealthStatus = async () => {
    try {
        await sequelize.authenticate();
        const [result] = await sequelize.query('SELECT NOW() as time, version() as version');
        
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: config.database,
            host: config.host,
            port: config.port,
            serverTime: result[0]?.time,
            postgresVersion: result[0]?.version
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        };
    }
};

// ============================================
// Transaction Helper
// ============================================

/**
 * Execute function within transaction
 * @param {Function} callback - Async function to execute
 * @returns {Promise<any>}
 */
const withTransaction = async (callback) => {
    const transaction = await sequelize.transaction();
    try {
        const result = await callback(transaction);
        await transaction.commit();
        return result;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

// ============================================
// Query Logger (Development only)
// ============================================

let queryCount = 0;
const queryLogs = [];

/**
 * Log query for debugging
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 */
const logQuery = (sql, params) => {
    if (env !== 'production') {
        queryCount++;
        queryLogs.push({
            id: queryCount,
            sql,
            params,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 100 queries
        while (queryLogs.length > 100) {
            queryLogs.shift();
        }
    }
};

/**
 * Get query statistics
 * @returns {Object}
 */
const getQueryStats = () => {
    return {
        totalQueries: queryCount,
        recentQueries: queryLogs.slice(-10)
    };
};

/**
 * Reset query stats
 */
const resetQueryStats = () => {
    queryCount = 0;
    queryLogs.length = 0;
};

// ============================================
// Module Exports
// ============================================

module.exports = {
    sequelize,
    Sequelize,
    config,
    env,
    testConnection,
    syncDatabase,
    closeConnection,
    getHealthStatus,
    withTransaction,
    logQuery,
    getQueryStats,
    resetQueryStats,
    
    // Direct exports for convenience
    db: sequelize
};