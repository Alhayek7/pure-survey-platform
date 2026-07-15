const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const QuestionOption = sequelize.define('QuestionOption', { id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, question_id: { type: DataTypes.INTEGER, allowNull: false }, option_text: { type: DataTypes.STRING(200), allowNull: false }, option_value: { type: DataTypes.STRING(100) }, order_number: { type: DataTypes.INTEGER, allowNull: false } }, { tableName: 'question_options', indexes: [{ fields: ['question_id'] }] });
module.exports = QuestionOption;
