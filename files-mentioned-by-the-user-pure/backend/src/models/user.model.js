const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { ROLES } = require('../utils/constants');
const User = sequelize.define('User', { id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, name: { type: DataTypes.STRING(100), allowNull: false }, email: { type: DataTypes.STRING(255), allowNull: false, unique: true, validate: { isEmail: true } }, password_hash: { type: DataTypes.STRING(255), allowNull: false }, role: { type: DataTypes.ENUM(...Object.values(ROLES)), defaultValue: ROLES.USER }, is_active: { type: DataTypes.BOOLEAN, defaultValue: true }, created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }, updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW } }, { tableName: 'users', indexes: [{ fields: ['email'] }, { fields: ['role'] }] });
module.exports = User;
