const assert = require('node:assert/strict');
const { describe, it, before, after, mock } = require('node:test');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = require('../src/db');

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';

const authService = require('../src/services/authService');

const noopQuery = mock.fn(() => Promise.resolve({ rows: [], rowCount: 0 }));

function mockQuery(result) {
    return mock.fn(() => Promise.resolve({ rows: result, rowCount: result ? result.length : 0 }));
}

describe('register', () => {
    it('debe registrar un nuevo usuario correctamente', async () => {
        const originalQuery = pool.query;
        pool.query = mockQuery([]);

        const result = await authService.register({
            email: 'test@test.com',
            password: '12345678',
            nombre: 'Juan',
            apellido: 'Perez',
            tipo_usuario: 'arrendatario'
        });

        assert.equal(result.email, 'test@test.com');
        assert.equal(result.nombre, 'Juan');
        assert.equal(result.tipo_usuario, 'arrendatario');
        assert.ok(result.id);
        assert.ok(result.token_verificacion);

        pool.query = originalQuery;
    });

    it('debe lanzar ConflictError si el email ya existe', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn((sql) => {
            if (sql.includes('SELECT')) {
                return Promise.resolve({ rows: [{ id: 'existing-id' }], rowCount: 1 });
            }
            return Promise.resolve({ rows: [], rowCount: 0 });
        });

        await assert.rejects(
            () => authService.register({
                email: 'existente@test.com',
                password: '12345678',
                nombre: 'Juan',
                apellido: 'Perez',
                tipo_usuario: 'arrendatario'
            }),
            (err) => {
                assert.equal(err.statusCode, 409);
                assert.equal(err.code, 'CONFLICT');
                assert.equal(err.message, 'El email ya está registrado');
                return true;
            }
        );

        pool.query = originalQuery;
    });
});

describe('login', () => {
    it('debe iniciar sesion con credenciales validas y devolver token JWT', async () => {
        const originalQuery = pool.query;
        const passwordHash = await bcrypt.hash('password123', 12);
        const mockUser = {
            id: 'user-id-123',
            email: 'user@test.com',
            password_hash: passwordHash,
            nombre: 'Juan',
            apellido: 'Perez',
            tipo_usuario: 'arrendatario',
            foto_url: null
        };

        pool.query = mock.fn((sql) => {
            if (sql.includes('UPDATE')) {
                return Promise.resolve({ rows: [], rowCount: 1 });
            }
            return Promise.resolve({ rows: [mockUser], rowCount: 1 });
        });

        const result = await authService.login({ email: 'user@test.com', password: 'password123' });

        assert.ok(result.token);
        assert.equal(result.usuario.email, 'user@test.com');
        assert.equal(result.usuario.tipo_usuario, 'arrendatario');

        const decoded = jwt.verify(result.token, 'test-secret');
        assert.equal(decoded.id, 'user-id-123');
        assert.equal(decoded.email, 'user@test.com');

        pool.query = originalQuery;
    });

    it('debe lanzar UnauthorizedError si el email no existe', async () => {
        const originalQuery = pool.query;
        pool.query = mockQuery([]);

        await assert.rejects(
            () => authService.login({ email: 'noexiste@test.com', password: 'password123' }),
            (err) => {
                assert.equal(err.statusCode, 401);
                assert.equal(err.message, 'Credenciales inválidas');
                return true;
            }
        );

        pool.query = originalQuery;
    });

    it('debe lanzar UnauthorizedError si la contrasena es incorrecta', async () => {
        const originalQuery = pool.query;
        const passwordHash = await bcrypt.hash('realpassword', 12);
        pool.query = mockQuery([{
            id: 'user-id',
            email: 'user@test.com',
            password_hash: passwordHash,
            activo: true
        }]);

        await assert.rejects(
            () => authService.login({ email: 'user@test.com', password: 'wrongpassword' }),
            (err) => {
                assert.equal(err.statusCode, 401);
                return true;
            }
        );

        pool.query = originalQuery;
    });

    it('debe lanzar UnauthorizedError si el usuario esta inactivo', async () => {
        const originalQuery = pool.query;
        pool.query = mockQuery([]);

        await assert.rejects(
            () => authService.login({ email: 'inactivo@test.com', password: 'password123' }),
            (err) => {
                assert.equal(err.statusCode, 401);
                return true;
            }
        );

        pool.query = originalQuery;
    });
});

describe('getProfile', () => {
    it('debe devolver el perfil del usuario', async () => {
        const originalQuery = pool.query;
        pool.query = mockQuery([{
            id: 'user-id',
            email: 'user@test.com',
            nombre: 'Juan',
            apellido: 'Perez',
            telefono: '3001234567',
            tipo_usuario: 'propietario',
            foto_url: null,
            email_verificado: true,
            verificado_2fa: false,
            activo: true,
            ultimo_acceso: null,
            creado_en: new Date()
        }]);

        const profile = await authService.getProfile('user-id');
        assert.equal(profile.email, 'user@test.com');
        assert.equal(profile.tipo_usuario, 'propietario');

        pool.query = originalQuery;
    });

    it('debe lanzar NotFoundError si el usuario no existe', async () => {
        const originalQuery = pool.query;
        pool.query = mockQuery([]);

        await assert.rejects(
            () => authService.getProfile('non-existent-id'),
            (err) => {
                assert.equal(err.statusCode, 404);
                assert.equal(err.message, 'Usuario no encontrado');
                return true;
            }
        );

        pool.query = originalQuery;
    });
});

describe('updateProfile', () => {
    it('debe actualizar solo los campos enviados', async () => {
        const originalQuery = pool.query;
        let updateCalled = false;
        pool.query = mock.fn((sql) => {
            if (sql.startsWith('UPDATE')) {
                updateCalled = true;
                assert.ok(sql.includes('nombre'));
                assert.ok(sql.includes('telefono'));
                assert.ok(!sql.includes('apellido'));
                return Promise.resolve({ rows: [], rowCount: 1 });
            }
            return Promise.resolve({ rows: [{ id: 'user-id', email: 'test@test.com', nombre: 'NuevoNombre', apellido: 'Perez', telefono: '3009999999', tipo_usuario: 'propietario' }], rowCount: 1 });
        });

        await authService.updateProfile('user-id', { nombre: 'NuevoNombre', telefono: '3009999999' });
        assert.ok(updateCalled);

        pool.query = originalQuery;
    });

    it('debe retornar el perfil sin cambios si no se envian campos', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn((sql) => {
            if (sql.startsWith('SELECT')) {
                return Promise.resolve({ rows: [{ id: 'user-id', email: 'test@test.com', nombre: 'Juan', apellido: 'Perez', telefono: null, tipo_usuario: 'arrendatario' }], rowCount: 1 });
            }
            return Promise.resolve({ rows: [], rowCount: 0 });
        });

        const result = await authService.updateProfile('user-id', {});
        assert.equal(result.nombre, 'Juan');

        pool.query = originalQuery;
    });
});

describe('2FA', () => {
    it('setup2FA debe generar secreto y QR', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({ rows: [], rowCount: 1 }));

        const result = await authService.setup2FA('user-id');
        assert.ok(result.secret);
        assert.ok(result.qrCode);
        assert.ok(result.qrCode.startsWith('data:image/png;base64,'));

        pool.query = originalQuery;
    });

    it('verify2FA debe marcar como verificado en BD si el codigo es correcto', async () => {
        const originalQuery = pool.query;
        const secret = require('speakeasy').generateSecret();
        let updateVerificado = false;

        pool.query = mock.fn((sql) => {
            if (sql.includes('UPDATE') && sql.includes('verificado_2fa')) {
                updateVerificado = true;
                return Promise.resolve({ rows: [], rowCount: 1 });
            }
            return Promise.resolve({ rows: [{ secreto_2fa: secret.base32 }], rowCount: 1 });
        });

        const token = require('speakeasy').totp({ secret: secret.base32, encoding: 'base32' });
        await authService.verify2FA('user-id', token);
        assert.ok(updateVerificado);

        pool.query = originalQuery;
    });

    it('verify2FA debe lanzar error con codigo invalido', async () => {
        const originalQuery = pool.query;
        const secret = require('speakeasy').generateSecret();
        pool.query = mock.fn(() => Promise.resolve({ rows: [{ secreto_2fa: secret.base32 }], rowCount: 1 }));

        await assert.rejects(
            () => authService.verify2FA('user-id', '000000'),
            (err) => {
                assert.equal(err.statusCode, 401);
                assert.equal(err.message, 'Código 2FA inválido');
                return true;
            }
        );

        pool.query = originalQuery;
    });
});

describe('forgotPassword / resetPassword', () => {
    it('forgotPassword debe devolver solo success cuando el email existe', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn((sql) => {
            if (sql.includes('UPDATE')) {
                return Promise.resolve({ rows: [], rowCount: 1 });
            }
            return Promise.resolve({ rows: [{ id: 'user-id' }], rowCount: 1 });
        });

        const result = await authService.forgotPassword('user@test.com');
        assert.deepEqual(result, { success: true });
        assert.ok(!result.token);
        assert.ok(!result.email);

        pool.query = originalQuery;
    });

    it('forgotPassword debe devolver success aunque el email no exista', async () => {
        const originalQuery = pool.query;
        pool.query = mockQuery([]);

        const result = await authService.forgotPassword('noexiste@test.com');
        assert.deepEqual(result, { success: true });

        pool.query = originalQuery;
    });

    it('resetPassword debe actualizar la contrasena con token valido', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn((sql) => {
            if (sql.includes('UPDATE')) {
                return Promise.resolve({ rows: [], rowCount: 1 });
            }
            return Promise.resolve({ rows: [{ id: 'user-id' }], rowCount: 1 });
        });

        const result = await authService.resetPassword('valid-token', 'newpassword123');
        assert.deepEqual(result, { success: true });

        pool.query = originalQuery;
    });

    it('resetPassword debe lanzar error con token invalido', async () => {
        const originalQuery = pool.query;
        pool.query = mockQuery([]);

        await assert.rejects(
            () => authService.resetPassword('invalid-token', 'newpassword123'),
            (err) => {
                assert.equal(err.statusCode, 400);
                assert.equal(err.message, 'Token inválido o expirado');
                return true;
            }
        );

        pool.query = originalQuery;
    });
});

describe('validateToken', () => {
    it('debe devolver datos decodificados con token valido', async () => {
        const token = jwt.sign({ id: 'user-id', email: 'test@test.com' }, 'test-secret', { expiresIn: '1h' });
        const result = await authService.validateToken(token);
        assert.equal(result.id, 'user-id');
        assert.equal(result.email, 'test@test.com');
    });

    it('debe devolver null con token invalido', async () => {
        const result = await authService.validateToken('token-invalido');
        assert.equal(result, null);
    });

    it('debe devolver null con token expirado', async () => {
        const token = jwt.sign({ id: 'user-id' }, 'test-secret', { expiresIn: '0s' });
        await new Promise(r => setTimeout(r, 100));
        const result = await authService.validateToken(token);
        assert.equal(result, null);
    });
});
