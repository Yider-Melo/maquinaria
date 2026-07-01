const assert = require('node:assert/strict');
const { describe, it, before, after } = require('node:test');

const { Pool } = require('pg');

process.env.JWT_SECRET = 'test-secret';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'rentamaq_auth_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = '0000';

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const authController = require('./authController');

async function clean() {
    await pool.query('DELETE FROM usuarios');
}

before(async () => {
    const { Pool: PgPool } = require('pg');
    const testPool = new PgPool({
        host: 'localhost', port: 5432, database: 'rentamaq_auth_test',
        user: 'postgres', password: '0000'
    });
    await testPool.query('DELETE FROM usuarios');
    await testPool.end();
});

after(async () => {
    await pool.end();
});

describe('auth integration', () => {
    before(async () => {
        await clean();
    });

    it('debe registrar un usuario y persistirlo en BD', async () => {
        const result = await authController.register({
            email: 'integracion@test.com',
            password: 'password123',
            nombre: 'Test',
            apellido: 'Integration',
            telefono: '3001112233',
            tipo_usuario: 'arrendatario'
        });

        assert.ok(result.id);
        assert.equal(result.email, 'integracion@test.com');

        const dbResult = await pool.query('SELECT * FROM usuarios WHERE id = $1', [result.id]);
        assert.equal(dbResult.rows.length, 1);
        assert.equal(dbResult.rows[0].email, 'integracion@test.com');
        assert.equal(dbResult.rows[0].nombre, 'Test');
    });

    it('debe rechazar registro con email duplicado', async () => {
        await assert.rejects(
            () => authController.register({
                email: 'integracion@test.com',
                password: 'password123',
                nombre: 'Otro',
                apellido: 'User',
                tipo_usuario: 'propietario'
            }),
            (err) => { assert.equal(err.statusCode, 409); return true; }
        );
    });

    it('debe iniciar sesion con credenciales validas', async () => {
        const result = await authController.login({
            email: 'integracion@test.com',
            password: 'password123'
        });

        assert.ok(result.token);
        assert.equal(result.usuario.email, 'integracion@test.com');
        assert.equal(result.usuario.nombre, 'Test');

        const decoded = jwt.verify(result.token, 'test-secret');
        assert.equal(decoded.id, result.usuario.id);
    });

    it('debe rechazar login con contrasena incorrecta', async () => {
        await assert.rejects(
            () => authController.login({
                email: 'integracion@test.com',
                password: 'wrongpassword'
            }),
            (err) => { assert.equal(err.statusCode, 401); return true; }
        );
    });

    it('debe rechazar login con email inexistente', async () => {
        await assert.rejects(
            () => authController.login({
                email: 'noexiste@test.com',
                password: 'password123'
            }),
            (err) => { assert.equal(err.statusCode, 401); return true; }
        );
    });

    it('debe obtener perfil del usuario', async () => {
        const userResult = await pool.query(
            "SELECT id FROM usuarios WHERE email = 'integracion@test.com'"
        );
        const profile = await authController.getProfile(userResult.rows[0].id);

        assert.equal(profile.email, 'integracion@test.com');
        assert.equal(profile.nombre, 'Test');
        assert.equal(profile.tipo_usuario, 'arrendatario');
    });

    it('debe actualizar perfil del usuario', async () => {
        const userResult = await pool.query(
            "SELECT id FROM usuarios WHERE email = 'integracion@test.com'"
        );
        const userId = userResult.rows[0].id;

        await authController.updateProfile(userId, {
            nombre: 'TestActualizado',
            telefono: '3009998877'
        });

        const dbResult = await pool.query('SELECT * FROM usuarios WHERE id = $1', [userId]);
        assert.equal(dbResult.rows[0].nombre, 'TestActualizado');
        assert.equal(dbResult.rows[0].telefono, '3009998877');
    });

    it('debe configurar y verificar 2FA', async () => {
        const userResult = await pool.query(
            "SELECT id FROM usuarios WHERE email = 'integracion@test.com'"
        );
        const userId = userResult.rows[0].id;

        const setupResult = await authController.setup2FA(userId);
        assert.ok(setupResult.secret);
        assert.ok(setupResult.qrCode);

        const dbResult = await pool.query('SELECT secreto_2fa FROM usuarios WHERE id = $1', [userId]);
        assert.ok(dbResult.rows[0].secreto_2fa);

        const speakeasy = require('speakeasy');
        const token = speakeasy.totp({ secret: setupResult.secret, encoding: 'base32' });

        const verified = await authController.verify2FA(userId, token);
        assert.equal(verified, true);

        const dbAfter = await pool.query('SELECT verificado_2fa FROM usuarios WHERE id = $1', [userId]);
        assert.equal(dbAfter.rows[0].verificado_2fa, true);
    });

    it('debe generar y usar token de recuperacion de contrasena', async () => {
        const result = await authController.forgotPassword('integracion@test.com');
        assert.deepEqual(result, { success: true });

        const userResult = await pool.query(
            "SELECT token_recuperacion, expiracion_token_recuperacion FROM usuarios WHERE email = 'integracion@test.com'"
        );
        assert.ok(userResult.rows[0].token_recuperacion);
        assert.ok(userResult.rows[0].expiracion_token_recuperacion);

        const token = userResult.rows[0].token_recuperacion;
        await authController.resetPassword(token, 'nuevapassword456');

        const loginResult = await authController.login({
            email: 'integracion@test.com',
            password: 'nuevapassword456'
        });
        assert.ok(loginResult.token);

        const oldTokenResult = await pool.query(
            "SELECT token_recuperacion FROM usuarios WHERE email = 'integracion@test.com'"
        );
        assert.equal(oldTokenResult.rows[0].token_recuperacion, null);
    });

    it('debe validar token JWT', async () => {
        const loginResult = await authController.login({
            email: 'integracion@test.com',
            password: 'nuevapassword456'
        });

        const valid = await authController.validateToken(loginResult.token);
        assert.equal(valid.email, 'integracion@test.com');

        const invalid = await authController.validateToken('token-falso');
        assert.equal(invalid, null);
    });
});
