// Punto de entrada del servicio de pagos.
// Configura Express con middleware y monta las rutas de /pagos.
// Opera en modo consulta directa sin integracion con RabbitMQ.
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const routes = require('./routes');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Endpoint de salud para el balanceador / healthcheck
app.get('/health', (_req, res) => {
    res.json({ success: true, service: 'payment-service', status: 'running' });
});

app.use('/', routes);

async function ensurePaymentSchema() {
    await pool.query('ALTER TABLE pago ADD COLUMN IF NOT EXISTS propietario_id UUID');
}

console.log('Payment Service modo: consulta directa (sin RabbitMQ)');

ensurePaymentSchema()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Payment Service corriendo en puerto ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Error asegurando esquema de pago:', err);
        process.exit(1);
    });
