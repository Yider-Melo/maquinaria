const pool = require('../db');

const PAGO_COLUMNS = `id, reserva_id, usuario_id, propietario_id, monto, metodo_pago,
    estado, referencia_pasarela, referencia_pasarela_mp, checkout_url, creado_en, actualizado_en`;

async function findReservaById(bookingId) {
    const result = await pool.query(
        `SELECT id, precio_total, maquinaria_id, propietario_id, arrendatario_id, fecha_inicio, fecha_fin, estado
         FROM reserva WHERE id = $1`,
        [bookingId]
    );
    return result.rows[0] || null;
}

async function findActivePaymentByBooking(bookingId) {
    const result = await pool.query(
        `SELECT id, reserva_id, estado, referencia_pasarela, checkout_url FROM pago WHERE reserva_id = $1 AND estado IN ('pendiente', 'procesando', 'retenido')`,
        [bookingId]
    );
    return result.rows[0] || null;
}

// Busca si la reserva ya tiene un pago aprobado (retenido o liberado).
// Se usa para evitar crear pagos duplicados cuando el arrendatario
// vuelve a iniciar el checkout sobre una reserva ya pagada.
async function findApprovedPaymentByBooking(bookingId) {
    const result = await pool.query(
        `SELECT id, estado FROM pago
         WHERE reserva_id = $1 AND estado IN ('retenido', 'liberado')
         ORDER BY creado_en DESC LIMIT 1`,
        [bookingId]
    );
    return result.rows[0] || null;
}

async function updateCheckoutUrl(id, url) {
    await pool.query(
        'UPDATE pago SET checkout_url = $1, actualizado_en = CURRENT_TIMESTAMP WHERE id = $2',
        [url, id]
    );
}

async function insert({ id, bookingId, userId, propietarioId, monto, metodoPago, referenciaPasarela }) {
    await pool.query(
        `INSERT INTO pago (id, reserva_id, usuario_id, propietario_id, monto, metodo_pago, estado, referencia_pasarela)
         VALUES ($1, $2, $3, $4, $5, $6, 'pendiente', $7)`,
        [id, bookingId, userId, propietarioId, monto, metodoPago || 'tarjeta_credito', referenciaPasarela]
    );
}

async function findByReferenciaPasarela(referencia) {
    const result = await pool.query(
        'SELECT id, estado, reserva_id FROM pago WHERE referencia_pasarela = $1',
        [referencia]
    );
    return result.rows[0] || null;
}

async function findByWompiLinkId(linkId) {
    const result = await pool.query(
        `SELECT id, estado, reserva_id FROM pago
         WHERE checkout_url LIKE '%/l/' || $1`,
        [linkId]
    );
    return result.rows[0] || null;
}

async function updateEstado(id, estado) {
    await pool.query(
        'UPDATE pago SET estado = $1, actualizado_en = CURRENT_TIMESTAMP WHERE id = $2',
        [estado, id]
    );
}

async function updateEstadoTransicion(pagoId, fromEstados, nuevoEstado) {
    const result = await pool.query(
        `UPDATE pago SET estado = $1, actualizado_en = CURRENT_TIMESTAMP
         WHERE id = $2 AND estado = ANY($3::varchar[])
         RETURNING ${PAGO_COLUMNS}`,
        [nuevoEstado, pagoId, fromEstados]
    );
    return result.rows[0] || null;
}

async function findByIdWithReserva(pagoId, userId) {
    const result = await pool.query(
        `SELECT ${PAGO_COLUMNS} FROM pago
         WHERE id = $1 AND (usuario_id = $2 OR propietario_id = $2)`,
        [pagoId, userId]
    );
    return result.rows[0] || null;
}

async function findByIdAdmin(pagoId) {
    const result = await pool.query(
        `SELECT ${PAGO_COLUMNS} FROM pago WHERE id = $1`,
        [pagoId]
    );
    return result.rows[0] || null;
}

async function findByBooking(bookingId, userId) {
    const result = await pool.query(
        `SELECT ${PAGO_COLUMNS} FROM pago
         WHERE reserva_id = $1 AND (usuario_id = $2 OR propietario_id = $2)
         ORDER BY creado_en DESC`,
        [bookingId, userId]
    );
    return result.rows;
}

async function findByUser(userId, page = 1, size = 20, q, estado) {
    const offset = (page - 1) * size;
    const conditions = ['(usuario_id = $1 OR propietario_id = $1)'];
    const params = [userId];
    if (estado) {
        params.push(estado);
        conditions.push(`estado = $${params.length}`);
    }
    if (q) {
        params.push(`%${q}%`);
        conditions.push(`(CAST(id AS TEXT) ILIKE $${params.length} OR CAST(reserva_id AS TEXT) ILIKE $${params.length} OR referencia_pasarela ILIKE $${params.length} OR CAST(monto AS TEXT) ILIKE $${params.length})`);
    }
    const where = `WHERE ${conditions.join(' AND ')}`;
    const countResult = await pool.query(`SELECT COUNT(*) FROM pago ${where}`, params);
    const total = parseInt(countResult.rows[0].count, 10);
    const result = await pool.query(
        `SELECT ${PAGO_COLUMNS} FROM pago ${where}
         ORDER BY creado_en DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, size, offset]
    );
    return { data: result.rows, total };
}

async function findByMonth(mes, page = 1, size = 10, q) {
    const offset = (page - 1) * size;
    const params = [mes];
    let filtro = '';
    if (q) {
        params.push(`%${q}%`);
        filtro = ' AND (CAST(id AS TEXT) ILIKE $2 OR CAST(reserva_id AS TEXT) ILIKE $2)';
    }
    const countResult = await pool.query(
        `SELECT COUNT(*) FROM pago WHERE to_char(creado_en, 'YYYY-MM') = $1${filtro}`,
        params
    );
    const total = parseInt(countResult.rows[0].count, 10);
    const result = await pool.query(
        `SELECT ${PAGO_COLUMNS}, comision, monto_propietario, payout_estado
         FROM pago
         WHERE to_char(creado_en, 'YYYY-MM') = $1${filtro}
         ORDER BY creado_en DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, size, offset]
    );
    return { data: result.rows, total };
}

async function findByEstado(estado, page = 1, size = 10) {
    const offset = (page - 1) * size;
    const countResult = await pool.query(
        `SELECT COUNT(*) FROM pago WHERE estado = $1`,
        [estado]
    );
    const total = parseInt(countResult.rows[0].count, 10);
    const result = await pool.query(
        `SELECT ${PAGO_COLUMNS}, comision, monto_propietario, payout_estado
         FROM pago
         WHERE estado = $1
         ORDER BY creado_en DESC
         LIMIT $2 OFFSET $3`,
        [estado, size, offset]
    );
    return { data: result.rows, total };
}

async function findByIdSimple(pagoId) {
    const result = await pool.query(
        `SELECT id, usuario_id, propietario_id, reserva_id, monto, estado,
                comision, monto_propietario, referencia_pasarela_mp,
                payout_estado, payout_intentos
         FROM pago WHERE id = $1`,
        [pagoId]
    );
    return result.rows[0] || null;
}

async function updateReferenciaPasarela(id, mpPaymentId) {
    await pool.query(
        'UPDATE pago SET referencia_pasarela_mp = $1, actualizado_en = CURRENT_TIMESTAMP WHERE id = $2',
        [mpPaymentId, id]
    );
}

async function updateEstadoWhere(pagoId, estadoActual, nuevoEstado) {
    const result = await pool.query(
        `UPDATE pago SET estado = $1, actualizado_en = CURRENT_TIMESTAMP
         WHERE id = $2 AND estado = $3 RETURNING ${PAGO_COLUMNS}`,
        [nuevoEstado, pagoId, estadoActual]
    );
    return result.rows[0] || null;
}

async function findPaymentByBooking(bookingId) {
    const result = await pool.query(
        `SELECT id, propietario_id, usuario_id, reserva_id,
                referencia_pasarela_mp, monto,
                comision, monto_propietario, payout_estado
         FROM pago
         WHERE reserva_id = $1 AND estado = 'retenido'
         ORDER BY creado_en DESC LIMIT 1`,
        [bookingId]
    );
    return result.rows[0] || null;
}

async function updatePayoutInfo(pagoId, { comision, montoPropietario, payoutEstado, payoutError }) {
    const result = await pool.query(
        `UPDATE pago SET
            comision = COALESCE($1, comision),
            monto_propietario = COALESCE($2, monto_propietario),
            payout_estado = COALESCE($3, payout_estado),
            payout_error = COALESCE($4, payout_error),
            payout_intentos = CASE WHEN $3 IS NOT NULL THEN payout_intentos + 1 ELSE payout_intentos END,
            actualizado_en = CURRENT_TIMESTAMP
         WHERE id = $5 RETURNING id`,
        [comision, montoPropietario, payoutEstado, payoutError, pagoId]
    );
    return result.rows[0] || null;
}

async function markPayoutCompleted(pagoId) {
    await pool.query(
        `UPDATE pago SET
            payout_estado = 'completado',
            payout_completado_en = CURRENT_TIMESTAMP,
            actualizado_en = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [pagoId]
    );
}

// Guarda el id del lote de dispersión que Wompi devolvió, para poder casar
// después los eventos del webhook de Pagos a Terceros (payout.updated /
// transaction.updated) con el pago correspondiente.
async function updateWompiPayoutId(pagoId, wompiPayoutId) {
    if (!wompiPayoutId) return null;
    await pool.query(
        'UPDATE pago SET payout_id = $1, actualizado_en = CURRENT_TIMESTAMP WHERE id = $2',
        [String(wompiPayoutId), pagoId]
    );
}

async function findByWompiPayoutId(wompiPayoutId) {
    if (!wompiPayoutId) return null;
    const result = await pool.query(
        'SELECT id, propietario_id, reserva_id, payout_estado FROM pago WHERE payout_id = $1',
        [String(wompiPayoutId)]
    );
    return result.rows[0] || null;
}

async function insertMovimiento({ pagoId, reservaId, tipo, monto, descripcion, referenciaTipo, referenciaId }) {
    const result = await pool.query(
        `INSERT INTO movimiento (id, pago_id, reserva_id, tipo, monto, descripcion, referencia_tipo, referencia_id)
         VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [pagoId, reservaId, tipo, monto, descripcion, referenciaTipo, referenciaId]
    );
    return result.rows[0];
}

async function markLiberado(pagoId) {
    await pool.query(
        `UPDATE pago SET
            estado = 'liberado',
            liberado_en = CURRENT_TIMESTAMP,
            actualizado_en = CURRENT_TIMESTAMP
         WHERE id = $1 AND estado = 'retenido'`,
        [pagoId]
    );
}

async function findFailedPayouts() {
    const result = await pool.query(
        `SELECT id, reserva_id, propietario_id, monto, comision, monto_propietario,
                payout_estado, payout_intentos, payout_error, creado_en
         FROM pago
         WHERE payout_estado = 'fallido'
            OR (estado = 'liberado' AND payout_estado = 'pendiente')
         ORDER BY creado_en DESC`
    );
    return result.rows;
}

async function findPendingPayouts() {
    const result = await pool.query(
        `SELECT id, reserva_id, propietario_id, monto, comision, monto_propietario,
                payout_estado, payout_intentos, payout_error, creado_en
         FROM pago
         WHERE estado = 'liberado' AND (payout_estado IS NULL OR payout_estado IN ('pendiente', 'fallido'))
         ORDER BY creado_en DESC`
    );
    return result.rows;
}

// Un pago efectivo por reserva: se elige el pago en el estado "más avanzado"
// (liberado/reembolsado > retenido > pendiente/procesando > fallido) y, en empate,
// el más reciente. Evita que los totales se inflen con pagos duplicados de una
// misma reserva (p. ej. reintentos de checkout) y excluye intentos fallidos.
const RANKED_PAGO_CTE = `
    WITH ranked_pagos AS (
        SELECT p.*,
               ROW_NUMBER() OVER (
                   PARTITION BY p.reserva_id
                   ORDER BY
                       CASE p.estado
                           WHEN 'liberado' THEN 3
                           WHEN 'reembolsado' THEN 3
                           WHEN 'retenido' THEN 2
                           WHEN 'procesando' THEN 1
                           WHEN 'pendiente' THEN 1
                           ELSE 0
                       END DESC,
                       p.creado_en DESC
               ) AS rn
        FROM pago p
    )
`;

async function getDashboard(q, comisionTasa = 0.1) {
    const sharePropietario = 1 - comisionTasa;
    const totals = await pool.query(
        `${RANKED_PAGO_CTE}
         SELECT
            COUNT(*) FILTER (WHERE estado IN ('retenido', 'liberado')) AS total_transacciones,
            COALESCE(SUM(monto) FILTER (WHERE estado = 'liberado'), 0) AS total_liberado,
            COALESCE(SUM(monto) FILTER (WHERE estado = 'retenido'), 0) AS total_retenido,
            COALESCE(SUM(monto) FILTER (WHERE estado = 'reembolsado'), 0) AS total_reembolsado
         FROM ranked_pagos WHERE rn = 1`
    );
    // Los fallidos se cuentan como reservas distintas con al menos un intento fallido,
    // no como intentos individuales (varios intentos de una misma reserva cuentan 1).
    const fallidos = await pool.query(
        `SELECT COUNT(DISTINCT reserva_id) AS total FROM pago WHERE estado = 'fallido'`
    );
    const comisiones = await pool.query(
        `${RANKED_PAGO_CTE}
         SELECT
           COALESCE(SUM(CASE WHEN comision IS NULL OR comision = 0
                        THEN monto - ROUND(monto * $1)
                        ELSE comision END), 0) as total_comisiones,
           COUNT(*) as total_pagos_con_comision,
           COUNT(CASE WHEN payout_estado = 'fallido' THEN 1 END) as total_payouts_fallidos,
           COUNT(CASE WHEN payout_estado = 'pendiente' OR payout_estado IS NULL THEN 1 END) as total_payouts_pendientes
         FROM ranked_pagos WHERE rn = 1 AND estado = 'liberado'`,
        [sharePropietario]
    );
    const earnings = await pool.query(
        `SELECT COALESCE(SUM(monto), 0) as ganancia_total
         FROM movimiento WHERE tipo = 'comision_plataforma'`
    );
    const ultimosPagos = await pool.query(
        `${RANKED_PAGO_CTE}
         SELECT ${PAGO_COLUMNS}, comision, monto_propietario, payout_estado
         FROM ranked_pagos
         WHERE rn = 1${q
            ? ' AND (CAST(id AS TEXT) ILIKE $1 OR CAST(reserva_id AS TEXT) ILIKE $1 OR CAST(usuario_id AS TEXT) ILIKE $1 OR CAST(propietario_id AS TEXT) ILIKE $1 OR referencia_pasarela ILIKE $1 OR estado ILIKE $1)'
            : ''}
         ORDER BY creado_en DESC LIMIT ${q ? 200 : 10}`,
        q ? [`%${q}%`] : []
    );
    const porMes = await pool.query(
        `${RANKED_PAGO_CTE},
         fallidos_mes AS (
             SELECT to_char(creado_en, 'YYYY-MM') AS mes, COUNT(DISTINCT reserva_id) AS total_fallidos
             FROM pago WHERE estado = 'fallido'
             GROUP BY to_char(creado_en, 'YYYY-MM')
         ),
         comisiones_mes AS (
             SELECT to_char(creado_en, 'YYYY-MM') AS mes, COALESCE(SUM(monto), 0) AS total_comision
             FROM movimiento WHERE tipo = 'comision_plataforma'
             GROUP BY to_char(creado_en, 'YYYY-MM')
         )
         SELECT
            to_char(rp.creado_en, 'YYYY-MM') AS mes,
            COUNT(*) FILTER (WHERE rp.estado IN ('retenido', 'liberado')) AS total_transacciones,
            COALESCE(SUM(rp.monto) FILTER (WHERE rp.estado = 'liberado'), 0) AS total_liberado,
            COALESCE(SUM(rp.monto) FILTER (WHERE rp.estado = 'retenido'), 0) AS total_retenido,
            COALESCE(SUM(rp.monto) FILTER (WHERE rp.estado = 'reembolsado'), 0) AS total_reembolsado,
            COALESCE(cm.total_comision, 0) AS total_comision,
            COALESCE(fm.total_fallidos, 0) AS total_fallidos
         FROM ranked_pagos rp
         LEFT JOIN fallidos_mes fm ON fm.mes = to_char(rp.creado_en, 'YYYY-MM')
         LEFT JOIN comisiones_mes cm ON cm.mes = to_char(rp.creado_en, 'YYYY-MM')
         WHERE rp.rn = 1
         GROUP BY to_char(rp.creado_en, 'YYYY-MM'), fm.total_fallidos, cm.total_comision
         ORDER BY mes DESC`
    );
    return {
        resumen: { ...totals.rows[0], total_fallidos: parseInt(fallidos.rows[0].total, 10) || 0 },
        comisiones: comisiones.rows[0],
        ganancia_total: earnings.rows[0].ganancia_total,
        ultimos_pagos: ultimosPagos.rows,
        por_mes: porMes.rows
    };
}

async function findAllPaginated(page, size, q) {
    const offset = (page - 1) * size;
    const conditions = [];
    const params = [];
    if (q) {
        params.push(`%${q}%`);
        conditions.push('(CAST(id AS TEXT) ILIKE $1 OR CAST(reserva_id AS TEXT) ILIKE $1 OR CAST(usuario_id AS TEXT) ILIKE $1 OR CAST(propietario_id AS TEXT) ILIKE $1 OR referencia_pasarela ILIKE $1 OR estado ILIKE $1)');
    }
    const whereClause = conditions.length ? ` AND ${conditions.join(' AND ')}` : '';
    const countResult = await pool.query(
        `${RANKED_PAGO_CTE}
         SELECT COUNT(*) AS total FROM ranked_pagos WHERE rn = 1${whereClause}`,
        params
    );
    const dataResult = await pool.query(
        `${RANKED_PAGO_CTE}
         SELECT ${PAGO_COLUMNS}, comision, monto_propietario, payout_estado
         FROM ranked_pagos
         WHERE rn = 1${whereClause}
         ORDER BY creado_en DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, size, offset]
    );
    return { data: dataResult.rows, total: parseInt(countResult.rows[0].total, 10) || 0 };
}

module.exports = {
    findReservaById, findActivePaymentByBooking, findApprovedPaymentByBooking, insert,
    findByReferenciaPasarela, findByWompiLinkId, updateEstado, updateEstadoTransicion, updateCheckoutUrl,
    findByIdWithReserva, findByIdAdmin, findByBooking, findByUser, findByIdSimple,
    updateEstadoWhere, updateReferenciaPasarela, findPaymentByBooking,
    updatePayoutInfo, markPayoutCompleted, updateWompiPayoutId, findByWompiPayoutId,
    insertMovimiento,
    markLiberado, findFailedPayouts, findPendingPayouts, getDashboard,
    findAllPaginated, findByMonth, findByEstado
};
