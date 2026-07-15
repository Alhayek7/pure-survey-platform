const bcrypt = require('bcrypt');
const { User } = require('../models');
const { signToken, publicUser } = require('../utils/helpers');
async function register({ name, email, password }) { const existing = await User.findOne({ where: { email } }); if (existing) { const err = new Error('Email already registered'); err.status = 409; throw err; } const user = await User.create({ name, email, password_hash: await bcrypt.hash(password, 10) }); return { user: publicUser(user), token: signToken(user) }; }
async function login({ email, password }) { const user = await User.findOne({ where: { email } }); if (!user || !user.is_active || !(await bcrypt.compare(password, user.password_hash))) { const err = new Error('Invalid credentials'); err.status = 401; throw err; } return { user: publicUser(user), token: signToken(user) }; }
module.exports = { register, login };
