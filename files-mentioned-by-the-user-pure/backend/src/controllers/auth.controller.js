const bcrypt = require('bcrypt'); const authService = require('../services/auth.service'); const { publicUser } = require('../utils/helpers');
exports.register = async (req, res) => res.status(201).json(await authService.register(req.body));
exports.login = async (req, res) => res.json(await authService.login(req.body));
exports.me = async (req, res) => res.json({ user: publicUser(req.user) });
exports.updateProfile = async (req, res) => { if (req.body.name) req.user.name = req.body.name; if (req.body.password) req.user.password_hash = await bcrypt.hash(req.body.password, 10); req.user.updated_at = new Date(); await req.user.save(); res.json({ user: publicUser(req.user) }); };
