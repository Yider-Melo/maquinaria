// Punto de entrada del servicio de notificaciones.
// Configura Express, se suscribe a eventos de reservas via RabbitMQ,
// crea notificaciones en BD y las reenvia en tiempo real via WebSocket al API Gateway.
const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const routes = require('./routes');
const { eventBus } = require('shared');
const { createNotificationDirect } = require('./services/notificationService');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';

const app = express();
const PORT = process.env.PORT || 3007;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Endpoint de salud para el balanceador / healthcheck
app.get('/health', (_req, res) => {
    res.json({ success: true, service: 'notification-service', status: 'running' });
});

app.use('/', routes);

// Envia notificacion en tiempo real al API Gateway via HTTP interno
// para que este la reenvie por WebSocket al usuario correspondiente.
function notifyGatewayViaHttp(userId, titulo, mensaje) {
    const body = JSON.stringify({ userId, titulo, mensaje });
    const req = http.request(`${GATEWAY_URL}/_ws/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    });
    req.write(body);
    req.end();
}

app.listen(PORT, async () => {
    try {
        await eventBus.connect();
        console.log('Conectado a RabbitMQ');

        // Suscripcion a eventos de booking para crear notificaciones automaticamente
        eventBus.subscribeToEvent('booking.*', async (event) => {
            const { data } = event;
            await createNotificationDirect(
                data.usuario_id,
                data.tipo,
                data.titulo,
                data.mensaje,
                data.referencia_id,
                data.referencia_tipo
            );
            notifyGatewayViaHttp(data.usuario_id, data.titulo, data.mensaje);
            console.log('Notificación creada vía evento:', data.usuario_id);
        }, 'notification-booking-queue');

    } catch (err) {
        console.warn('RabbitMQ no disponible, usando endpoint HTTP directo:', err.message);
    }
    console.log(`Notification Service corriendo en puerto ${PORT}`);
});
