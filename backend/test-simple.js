require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

console.log('Starting server...');
console.log('PORT:', PORT);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', name: 'PURE Survey Platform' });
});

app.listen(PORT, () => {
    console.log('PURE Survey API running on http://localhost:' + PORT);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});
