const test = require('node:test'); const assert = require('node:assert/strict');
test('app exports express handler', () => { const app = require('../src/server'); assert.equal(typeof app, 'function'); });
