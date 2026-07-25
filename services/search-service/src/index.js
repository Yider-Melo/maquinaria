const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const routes = require('./routes');
const { eventBus, EVENT_TYPES, errorHandler, correlationId, requestLogger } = require('shared');
const pool = require('./db');
const createServiceLogger = require('../../../shared/logger');

const logger = createServiceLogger('search-service');

eventBus.setLogger(logger);

process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', { reason: reason?.message || reason, stack: reason?.stack });
});

const app = express();
const PORT = process.env.PORT || 3003;
app.locals.logger = logger;

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : (process.env.NODE_ENV === 'development' ? ['http://localhost:4200', 'http://127.0.0.1:4200'] : ['http://localhost:3000']), credentials: true }));
app.use(correlationId);
app.use(requestLogger);
app.use(express.json());

app.get('/health', (_req, res) => {
    res.json({ success: true, service: 'search-service', status: 'running' });
});

app.use('/', routes);

app.use(errorHandler);

app.listen(PORT, async () => {
    try {
        await eventBus.connect();
        logger.info('Conectado a RabbitMQ');

        eventBus.subscribeToEvent('machinery.*', async (event) => {
            const { data } = event;
            if (event.event === EVENT_TYPES.MACHINERY.CREATED || event.event === EVENT_TYPES.MACHINERY.UPDATED) {
                await pool.query(
                    `INSERT INTO maquinaria (id, propietario_id, titulo, descripcion, tipo, marca, modelo, anio, capacidad, estado, precio_por_dia, ubicacion_lat, ubicacion_lng, direccion, ciudad, departamento, puntuacion_promedio, total_resenas, disponible, activo)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
                     ON CONFLICT (id) DO UPDATE SET
                       titulo=EXCLUDED.titulo, descripcion=EXCLUDED.descripcion, tipo=EXCLUDED.tipo,
                       marca=EXCLUDED.marca, modelo=EXCLUDED.modelo, anio=EXCLUDED.anio,
                       precio_por_dia=EXCLUDED.precio_por_dia, ubicacion_lat=EXCLUDED.ubicacion_lat,
                       ubicacion_lng=EXCLUDED.ubicacion_lng, ciudad=EXCLUDED.ciudad,
                       departamento=EXCLUDED.departamento, puntuacion_promedio=EXCLUDED.puntuacion_promedio,
                       total_resenas=EXCLUDED.total_resenas, disponible=EXCLUDED.disponible,
                       activo=EXCLUDED.activo`,
                    [data.id, data.propietario_id, data.titulo, data.descripcion, data.tipo,
                     data.marca, data.modelo, data.anio, data.capacidad, data.estado,
                     data.precio_por_dia, data.ubicacion_lat, data.ubicacion_lng,
                     data.direccion, data.ciudad, data.departamento,
                     data.puntuacion_promedio || 0, data.total_resenas || 0, true, true]
                );
                logger.info('Índice actualizado vía evento:', { id: data.id });
            } else if (event.event === EVENT_TYPES.MACHINERY.DELETED) {
                await pool.query('UPDATE maquinaria SET activo = false WHERE id = $1', [data.id]);
                logger.info('Índice eliminado vía evento:', { id: data.id });
            }
        }, 'search-machinery-queue');

    } catch (err) {
        logger.warn('RabbitMQ no disponible, usando endpoints HTTP directos:', { message: err.message });
    }
    logger.info('Search Service iniciado', { port: PORT });
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM recibido, cerrando search-service');
    process.exit(0);
});
