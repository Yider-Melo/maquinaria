const pool = require('../db');

const RESERVA_COLUMNS = `id, maquinaria_id, arrendatario_id, propietario_id, fecha_inicio, fecha_fin,
    modalidad, cantidad_unidades, precio_unitario, precio_total, estado,
    motivo_cancelacion, creado_en, actualizado_en`;

async function getClient() {
    return pool;
}

async function insert({ id, maquinariaId, userId, propietarioId, fechaInicio, fechaFin, modalidad, cantidadUnidades, precioUnitario, precioTotal }, client) {
    const db = client || pool;
    const result = await db.query(
        `INSERT INTO reserva (id, maquinaria_id, arrendatario_id, propietario_id, fecha_inicio, fecha_fin, modalidad, cantidad_unidades, precio_unitario, precio_total, estado)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pendiente') RETURNING ${RESERVA_COLUMNS}`,
        [id, maquinariaId, userId, propietarioId, fechaInicio, fechaFin, modalidad, cantidadUnidades, precioUnitario, precioTotal]
    );
    return result.rows[0];
}

async function findConflictingBookings(machineryId, startDate, endDate, client) {
    const db = client || pool;
    const lockClause = client ? ' FOR NO KEY UPDATE' : '';
    const result = await db.query(
        `SELECT fecha_inicio, fecha_fin FROM reserva
         WHERE maquinaria_id = $1
           AND estado IN ('pendiente', 'confirmada', 'pagada', 'en_curso')
           AND (fecha_inicio, fecha_fin) OVERLAPS ($2::date, $3::date)${lockClause}`,
        [machineryId, startDate, endDate]
    );
    return result.rows;
}

async function findOccupiedRanges(machineryId, startDate, endDate) {
    const result = await pool.query(
        `SELECT fecha_inicio, fecha_fin, estado FROM reserva
         WHERE maquinaria_id = $1
           AND estado IN ('pendiente', 'confirmada', 'en_curso')
           AND (fecha_inicio, fecha_fin) OVERLAPS ($2::date, $3::date)
         ORDER BY fecha_inicio ASC`,
        [machineryId, startDate, endDate]
    );
    return result.rows;
}

async function findById(id) {
    const result = await pool.query(`SELECT ${RESERVA_COLUMNS} FROM reserva WHERE id = $1`, [id]);
    return result.rows[0] || null;
}

async function findByUser(userId, page, size) {
    const offset = (page - 1) * size;
    const countResult = await pool.query('SELECT COUNT(*) FROM reserva WHERE arrendatario_id = $1', [userId]);
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query(
        `SELECT ${RESERVA_COLUMNS} FROM reserva WHERE arrendatario_id = $1 ORDER BY creado_en DESC LIMIT $2 OFFSET $3`,
        [userId, size, offset]
    );
    return { data: result.rows, total };
}

async function findByOwner(ownerId, page, size) {
    const offset = (page - 1) * size;
    const countResult = await pool.query('SELECT COUNT(*) FROM reserva WHERE propietario_id = $1', [ownerId]);
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query(
        `SELECT ${RESERVA_COLUMNS} FROM reserva WHERE propietario_id = $1 ORDER BY creado_en DESC LIMIT $2 OFFSET $3`,
        [ownerId, size, offset]
    );
    return { data: result.rows, total };
}

async function updateEstado(id, estado, client) {
    const db = client || pool;
    const result = await db.query(
        `UPDATE reserva SET estado = $1, actualizado_en = CURRENT_TIMESTAMP WHERE id = $2 RETURNING ${RESERVA_COLUMNS}`,
        [estado, id]
    );
    return result.rows[0];
}

async function cancel(id, motivo, client) {
    const db = client || pool;
    const result = await db.query(
        `UPDATE reserva SET estado = 'cancelada', motivo_cancelacion = $2, actualizado_en = CURRENT_TIMESTAMP WHERE id = $1 RETURNING ${RESERVA_COLUMNS}`,
        [id, motivo || 'Cancelado por el usuario']
    );
    return result.rows[0];
}

async function getAdminStats() {
    const result = await pool.query(
        `SELECT
            COUNT(*) as total,
            COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes,
            COUNT(CASE WHEN estado = 'confirmada' THEN 1 END) as confirmadas,
            COUNT(CASE WHEN estado = 'en_curso' THEN 1 END) as en_curso,
            COUNT(CASE WHEN estado = 'completada' THEN 1 END) as completadas,
            COUNT(CASE WHEN estado = 'cancelada' THEN 1 END) as canceladas,
            COUNT(CASE WHEN estado = 'rechazada' THEN 1 END) as rechazadas,
            COALESCE(SUM(precio_total), 0) as ingresos_totales,
            COALESCE(AVG(precio_total), 0) as promedio_por_reserva
         FROM reserva`
    );
    return result.rows[0];
}

async function findRecent(limit) {
    const result = await pool.query(
        `SELECT ${RESERVA_COLUMNS} FROM reserva ORDER BY creado_en DESC LIMIT $1`,
        [limit]
    );
    return result.rows;
}

async function withTransaction(callback) {
    let client;
    try {
        client = await pool.connect();
    } catch (err) {
        throw new Error('No se pudo conectar a la base de datos');
    }
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        if (client) client.release();
    }
}

module.exports = {
    getClient, insert, findConflictingBookings, findOccupiedRanges, findById,
    findByUser, findByOwner, updateEstado, cancel,
    getAdminStats, findRecent, withTransaction
};
