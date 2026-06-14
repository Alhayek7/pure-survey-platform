const { User, Survey, Response } = require('../models');
async function dashboardStats() { const [users, surveys, responses] = await Promise.all([User.count(), Survey.count(), Response.count()]); return { users, surveys, responses }; }
module.exports = { dashboardStats };
