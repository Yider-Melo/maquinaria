const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { authLimiter, userLimiter } = require('./rateLimiter');

describe('rateLimiter', () => {
    it('authLimiter debe ser una funcion middleware', () => {
        assert.equal(typeof authLimiter, 'function');
        assert.equal(authLimiter.length, 3);
    });

    it('userLimiter debe ser una funcion middleware', () => {
        assert.equal(typeof userLimiter, 'function');
        assert.equal(userLimiter.length, 3);
    });

    it('authLimiter y userLimiter deben ser distintos', () => {
        assert.notEqual(authLimiter, userLimiter);
    });
});
