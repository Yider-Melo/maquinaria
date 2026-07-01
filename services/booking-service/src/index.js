// Punto de entrada del servicio de reservas.
// Configura Express y se conecta a RabbitMQ para publicar eventos
// de reservas (creacion, confirmacion, rechazo, cancelacion, finalizacion).
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const routes = require('./routes');
const { eventBus } = require('shared');

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Endpoint de salud para el balanceador / healthcheck
app.get('/health', (_req, res) => {
    res.json({ success: true, service: 'booking-service', status: 'running' });
});

app.use('/', routes);

app.listen(PORT, async () => {
    try {
        await eventBus.connect();
        console.log('Conectado a RabbitMQ');
    } catch (err) {
        console.warn('RabbitMQ no disponible, eventos no se publicarán:', err.message);
    }
    console.log(`Booking Service corriendo en puerto ${PORT}`);
});
