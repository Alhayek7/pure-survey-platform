const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Log = sequelize.define('Log', { id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, level: { type: DataTypes.STRING(20), allowNull: false }, message: { type: DataTypes.TEXT, allowNull: false }, user_id: { type: DataTypes.INTEGER }, ip_address: { type: DataTypes.STRING(45) }, user_agent: { type: DataTypes.TEXT }, created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW } }, { tableName: 'logs', indexes: [{ fields: ['level'] }, { fields: ['user_id'] }, { fields: ['created_at'] }] });
module.exports = Log;
