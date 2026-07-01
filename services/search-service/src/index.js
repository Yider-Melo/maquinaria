// Punto de entrada del servicio de busqueda.
// Configura Express y se suscribe a eventos de maquinaria via RabbitMQ
// para mantener sincronizado un indice local de busqueda en PostgreSQL.
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const routes = require('./routes');
const { eventBus, EVENT_TYPES } = require('shared');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Endpoint de salud para el balanceador / healthcheck
app.get('/health', (_req, res) => {
    res.json({ success: true, service: 'search-service', status: 'running' });
});

app.use('/', routes);

app.listen(PORT, async () => {
    try {
        await eventBus.connect();
        console.log('Conectado a RabbitMQ');

        // Suscripcion a eventos de maquinaria para mantener el indice actualizado
        eventBus.subscribeToEvent('machinery.*', async (event) => {
            const { data } = event;
            if (event.event === EVENT_TYPES.MACHINERY.CREATED || event.event === EVENT_TYPES.MACHINERY.UPDATED) {
                await pool.query(
                    `INSERT INTO maquinaria (id, propietario_id, titulo, descripcion, tipo, marca, modelo, anio, capacidad, estado, precio_por_dia, ubicacion_lat, ubicacion_lng, direccion, ciudad, departamento, disponible, activo)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
                     ON CONFLICT (id) DO UPDATE SET
                       titulo=EXCLUDED.titulo, descripcion=EXCLUDED.descripcion, tipo=EXCLUDED.tipo,
                       marca=EXCLUDED.marca, modelo=EXCLUDED.modelo, anio=EXCLUDED.anio,
                       precio_por_dia=EXCLUDED.precio_por_dia, ubicacion_lat=EXCLUDED.ubicacion_lat,
                       ubicacion_lng=EXCLUDED.ubicacion_lng, ciudad=EXCLUDED.ciudad,
                       departamento=EXCLUDED.departamento, disponible=EXCLUDED.disponible,
                       activo=EXCLUDED.activo`,
                    [data.id, data.propietario_id, data.titulo, data.descripcion, data.tipo,
                     data.marca, data.modelo, data.anio, data.capacidad, data.estado,
                     data.precio_por_dia, data.ubicacion_lat, data.ubicacion_lng,
                     data.direccion, data.ciudad, data.departamento, true, true]
                );
                console.log('Índice actualizado vía evento:', data.id);
            } else if (event.event === EVENT_TYPES.MACHINERY.DELETED) {
                await pool.query('UPDATE maquinaria SET activo = false WHERE id = $1', [data.id]);
                console.log('Índice eliminado vía evento:', data.id);
            }
        }, 'search-machinery-queue');

    } catch (err) {
        console.warn('RabbitMQ no disponible, usando endpoints HTTP directos:', err.message);
    }
    console.log(`Search Service corriendo en puerto ${PORT}`);
});
