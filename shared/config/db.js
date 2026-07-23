const { Pool } = require('pg');

function buildPool(serviceName) {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || `rentamaq_${serviceName}`,
        user: process.env.DB_USER || 'postgres',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        query_timeout: 10000
    };

    if (!process.env.DB_PASSWORD && process.env.NODE_ENV === 'production') {
        throw new Error('DB_PASSWORD no configurado');
    }
    if (process.env.DB_PASSWORD) {
        config.password = process.env.DB_PASSWORD;
    }

    const pool = new Pool(config);

    pool.on('error', (err) => {
        console.error(`Error inesperado en el pool de ${serviceName}-db:`, err);
    });

    return pool;
}

module.exports = { buildPool };
