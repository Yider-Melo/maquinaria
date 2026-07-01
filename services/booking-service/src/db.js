// Pool de conexiones a PostgreSQL para el servicio de reservas.
// Lee las variables de entorno para conectarse a la BD rentamaq_booking.
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'rentamaq_booking',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '0000',
    max: 20,
    idleTimeoutMillis: 30000
});

module.exports = pool;
