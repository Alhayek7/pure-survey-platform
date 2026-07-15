const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_NAME || 'pure_survey', process.env.DB_USER || 'postgres', process.env.DB_PASSWORD || 'postgres', {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  dialect: 'postgres',
  logging: false,
  define: { underscored: true, timestamps: false }
});

module.exports = sequelize;
