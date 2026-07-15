require('dotenv').config();
const { sequelize } = require('../models');
const seedAdmin = require('./admin.seeder');
(async () => { await sequelize.authenticate(); await sequelize.sync({ alter: true }); await seedAdmin(); console.log('Database setup complete. Admin: admin@example.com / admin123'); await sequelize.close(); })().catch(err => { console.error(err); process.exit(1); });
