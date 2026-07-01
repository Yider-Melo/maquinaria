// Punto de entrada del servicio de calificaciones.
// Configura Express con middleware y monta las rutas de /calificaciones.
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3006;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Endpoint de salud para el balanceador / healthcheck
app.get('/health', (_req, res) => {
    res.json({ success: true, service: 'rating-service', status: 'running' });
});

app.use('/', routes);

app.listen(PORT, () => {
    console.log(`Rating Service corriendo en puerto ${PORT}`);
});
