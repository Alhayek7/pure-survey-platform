const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Attachment = sequelize.define('Attachment', { id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, original_name: { type: DataTypes.STRING(255), allowNull: false }, stored_name: { type: DataTypes.STRING(255), allowNull: false }, file_path: { type: DataTypes.STRING(500), allowNull: false }, mime_type: { type: DataTypes.STRING(100) }, file_size: { type: DataTypes.INTEGER }, uploaded_by: { type: DataTypes.INTEGER }, created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW } }, { tableName: 'attachments' });
module.exports = Attachment;
