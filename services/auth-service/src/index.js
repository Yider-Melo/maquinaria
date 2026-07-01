// Punto de entrada del servicio de autenticacion.
// Configura Express con middleware y monta las rutas de /auth.
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (_req, res) => {
    res.json({ success: true, service: 'auth-service', status: 'running' });
});

app.use('/', routes);

app.listen(PORT, () => {
    console.log(`Auth Service corriendo en puerto ${PORT}`);
});
