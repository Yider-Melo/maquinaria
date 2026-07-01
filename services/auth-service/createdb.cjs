const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, user: 'postgres', password: '0000', database: 'postgres' });
(async () => {
  const r = await pool.query('SELECT 1 FROM pg_database WHERE datname = $1', ['rentamaq_auth']);
  if (r.rows.length === 0) {
    await pool.query('CREATE DATABASE rentamaq_auth');
    console.log('rentamaq_auth creada');
  } else {
    console.log('rentamaq_auth ya existe');
  }
  const r2 = await pool.query('SELECT 1 FROM pg_database WHERE datname = $1', ['rentamaq_machinery']);
  if (r2.rows.length === 0) {
    await pool.query('CREATE DATABASE rentamaq_machinery');
    console.log('rentamaq_machinery creada');
  } else {
    console.log('rentamaq_machinery ya existe');
  }
  await pool.end();
})();
