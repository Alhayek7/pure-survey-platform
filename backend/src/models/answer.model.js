const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Answer = sequelize.define('Answer', { id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, response_id: { type: DataTypes.INTEGER, allowNull: false }, question_id: { type: DataTypes.INTEGER, allowNull: false }, answer_value: { type: DataTypes.TEXT, allowNull: false }, file_id: { type: DataTypes.INTEGER } }, { tableName: 'answers', indexes: [{ unique: true, fields: ['response_id', 'question_id'] }] });
module.exports = Answer;
