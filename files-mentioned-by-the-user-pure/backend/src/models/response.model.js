const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Response = sequelize.define('Response', { id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, survey_id: { type: DataTypes.INTEGER, allowNull: false }, user_id: { type: DataTypes.INTEGER }, respondent_name: { type: DataTypes.STRING(100) }, respondent_email: { type: DataTypes.STRING(255), validate: { isEmail: true } }, submitted_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW } }, { tableName: 'responses', indexes: [{ fields: ['survey_id'] }, { fields: ['user_id'] }, { fields: ['submitted_at'] }] });
module.exports = Response;
