const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { QUESTION_TYPES } = require('../utils/constants');
const Question = sequelize.define('Question', { id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, survey_id: { type: DataTypes.INTEGER, allowNull: false }, question_text: { type: DataTypes.TEXT, allowNull: false }, question_type: { type: DataTypes.ENUM(...QUESTION_TYPES), allowNull: false }, is_required: { type: DataTypes.BOOLEAN, defaultValue: false }, order_number: { type: DataTypes.INTEGER, allowNull: false }, validation_rules: { type: DataTypes.JSONB }, created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW } }, { tableName: 'questions', indexes: [{ fields: ['survey_id'] }] });
module.exports = Question;
