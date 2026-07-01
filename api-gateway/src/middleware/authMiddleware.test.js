const assert = require('node:assert/strict');
const { describe, it, before, mock } = require('node:test');

const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';

const { validateToken, requireRole, extractUser } = require('./authMiddleware');

function mockReq(headers = {}, user = null) {
    return {
        headers: { authorization: undefined, ...headers },
        user
    };
}

function mockRes() {
    const state = { statusCode: 200, body: null };
    return {
        state,
        status: (code) => { state.statusCode = code; return { json: (body) => { state.body = body; } }; },
        json: (body) => { state.body = body; }
    };
}

describe('validateToken', () => {
    it('debe rechazar si no hay header Authorization', () => {
        const req = mockReq();
        const res = mockRes();
        const next = mock.fn();

        validateToken(req, res, next);

        assert.equal(res.state.statusCode, 401);
        assert.equal(res.state.body.error.code, 'UNAUTHORIZED');
        assert.equal(next.mock.callCount(), 0);
    });

    it('debe rechazar si el header no es Bearer', () => {
        const req = mockReq({ authorization: 'Basic token' });
        const res = mockRes();
        const next = mock.fn();

        validateToken(req, res, next);

        assert.equal(res.state.statusCode, 401);
        assert.equal(next.mock.callCount(), 0);
    });

    it('debe rechazar si el token es invalido', () => {
        const req = mockReq({ authorization: 'Bearer token-invalido' });
        const res = mockRes();
        const next = mock.fn();

        validateToken(req, res, next);

        assert.equal(res.state.statusCode, 401);
        assert.equal(res.state.body.error.code, 'INVALID_TOKEN');
        assert.equal(next.mock.callCount(), 0);
    });

    it('debe aceptar token valido y decodificar usuario', () => {
        const token = jwt.sign({ id: 'user-id', tipo_usuario: 'propietario' }, 'test-secret', { expiresIn: '1h' });
        const req = mockReq({ authorization: `Bearer ${token}` });
        const res = mockRes();
        const next = mock.fn();

        validateToken(req, res, next);

        assert.equal(req.user.id, 'user-id');
        assert.equal(req.user.tipo_usuario, 'propietario');
        assert.equal(next.mock.callCount(), 1);
    });
});

describe('requireRole', () => {
    it('debe pasar si el usuario tiene el rol requerido', () => {
        const req = mockReq({}, { tipo_usuario: 'admin' });
        const res = mockRes();
        const next = mock.fn();

        requireRole('admin')(req, res, next);

        assert.equal(next.mock.callCount(), 1);
    });

    it('debe rechazar si el usuario no tiene el rol', () => {
        const req = mockReq({}, { tipo_usuario: 'arrendatario' });
        const res = mockRes();
        const next = mock.fn();

        requireRole('admin')(req, res, next);

        assert.equal(res.state.statusCode, 403);
        assert.equal(next.mock.callCount(), 0);
    });

    it('debe rechazar si no hay usuario', () => {
        const req = mockReq({}, null);
        const res = mockRes();
        const next = mock.fn();

        requireRole('admin')(req, res, next);

        assert.equal(res.state.statusCode, 403);
    });

    it('debe aceptar cualquiera de los roles', () => {
        const req = mockReq({}, { tipo_usuario: 'arrendatario' });
        const res = mockRes();
        const next = mock.fn();

        requireRole('propietario', 'arrendatario')(req, res, next);

        assert.equal(next.mock.callCount(), 1);
    });
});

describe('extractUser', () => {
    it('debe extraer usuario si hay token valido', () => {
        const token = jwt.sign({ id: 'user-id' }, 'test-secret', { expiresIn: '1h' });
        const req = mockReq({ authorization: `Bearer ${token}` });
        const next = mock.fn();

        extractUser(req, {}, next);

        assert.equal(req.user.id, 'user-id');
        assert.equal(next.mock.callCount(), 1);
    });

    it('debe continuar si no hay token', () => {
        const req = mockReq();
        const next = mock.fn();

        extractUser(req, {}, next);

        assert.equal(next.mock.callCount(), 1);
    });

    it('debe continuar si el token es invalido sin error', () => {
        const req = mockReq({ authorization: 'Bearer token-invalido' });
        const next = mock.fn();

        extractUser(req, {}, next);

        assert.equal(next.mock.callCount(), 1);
    });
});
