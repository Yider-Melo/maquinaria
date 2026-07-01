// Punto de entrada del servicio de maquinaria.
// Configura Express con middleware, monta las rutas de /maquinaria
// y se conecta a RabbitMQ para publicar eventos del dominio.
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const routes = require('./routes');
const { eventBus } = require('shared');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

// Endpoint de salud para el balanceador / healthcheck
app.get('/health', (_req, res) => {
    res.json({ success: true, service: 'machinery-service', status: 'running' });
});

app.use('/', routes);

app.listen(PORT, async () => {
    try {
        await eventBus.connect();
        console.log('Conectado a RabbitMQ');
    } catch (err) {
        console.warn('RabbitMQ no disponible, eventos no se publicarán:', err.message);
    }
    console.log(`Machinery Service corriendo en puerto ${PORT}`);
});
