const bcrypt = require('bcrypt'); const { User } = require('../models'); const { publicUser } = require('../utils/helpers');
exports.list = async (_req, res) => res.json((await User.findAll()).map(publicUser));
exports.get = async (req, res) => { const user = await User.findByPk(req.params.id); if (!user) return res.status(404).json({ message: 'User not found' }); res.json(publicUser(user)); };
exports.changeRole = async (req, res) => { const user = await User.findByPk(req.params.id); if (!user) return res.status(404).json({ message: 'User not found' }); await user.update({ role: req.body.role, updated_at: new Date() }); res.json(publicUser(user)); };
exports.remove = async (req, res) => { const user = await User.findByPk(req.params.id); if (!user) return res.status(404).json({ message: 'User not found' }); await user.destroy(); res.status(204).end(); };
exports.createAdminIfMissing = async () => { const email = 'admin@example.com'; const found = await User.findOne({ where: { email } }); if (!found) await User.create({ name: 'Admin User', email, password_hash: await bcrypt.hash('admin123', 10), role: 'admin' }); };
