const pool = require('../db');

const NOTIFICACION_COLUMNS = `id, usuario_id, tipo, titulo, mensaje, referencia_id, referencia_tipo,
    leida, leida_en, creado_en`;

async function insert({ id, userId, tipo, titulo, mensaje, referenciaId, referenciaTipo }) {
    await pool.query(
        `INSERT INTO notificacion (id, usuario_id, tipo, titulo, mensaje, referencia_id, referencia_tipo)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, userId, tipo, titulo, mensaje, referenciaId, referenciaTipo]
    );
}

async function findByUser(userId, page, size) {
    const offset = (page - 1) * size;
    const countResult = await pool.query(
        'SELECT COUNT(*) FROM notificacion WHERE usuario_id = $1',
        [userId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
        `SELECT ${NOTIFICACION_COLUMNS} FROM notificacion WHERE usuario_id = $1 ORDER BY creado_en DESC LIMIT $2 OFFSET $3`,
        [userId, size, offset]
    );

    const noLeidas = await pool.query(
        'SELECT COUNT(*) FROM notificacion WHERE usuario_id = $1 AND leida = false',
        [userId]
    );

    return {
        data: result.rows, total,
        no_leidas: parseInt(noLeidas.rows[0].count),
        page, size,
        totalPages: Math.ceil(total / size)
    };
}

async function countUnread(userId) {
    const result = await pool.query(
        'SELECT COUNT(*) FROM notificacion WHERE usuario_id = $1 AND leida = false',
        [userId]
    );
    return parseInt(result.rows[0].count);
}

async function markAsRead(notificationId, userId) {
    await pool.query(
        `UPDATE notificacion SET leida = true, leida_en = CURRENT_TIMESTAMP
         WHERE id = $1 AND usuario_id = $2`,
        [notificationId, userId]
    );
}

async function markAllAsRead(userId) {
    await pool.query(
        `UPDATE notificacion SET leida = true, leida_en = CURRENT_TIMESTAMP
         WHERE usuario_id = $1 AND leida = false`,
        [userId]
    );
}

module.exports = {
    insert, findByUser, countUnread, markAsRead, markAllAsRead
};
