const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { SURVEY_STATUS } = require('../utils/constants');
const Survey = sequelize.define('Survey', { id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, title: { type: DataTypes.STRING(200), allowNull: false }, description: { type: DataTypes.TEXT }, user_id: { type: DataTypes.INTEGER, allowNull: false }, status: { type: DataTypes.ENUM(...Object.values(SURVEY_STATUS)), defaultValue: SURVEY_STATUS.DRAFT }, is_public: { type: DataTypes.BOOLEAN, defaultValue: true }, created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }, updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW } }, { tableName: 'surveys', indexes: [{ fields: ['user_id'] }, { fields: ['status'] }] });
module.exports = Survey;
