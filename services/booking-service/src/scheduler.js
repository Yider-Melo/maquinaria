const cron = require('node-cron');
const axios = require('axios');
const reservaRepository = require('./repositories/reservaRepository');
const { eventBus, EVENT_TYPES } = require('shared');
const createServiceLogger = require('../../../shared/logger');

const logger = createServiceLogger('booking-scheduler');

const MACHINERY_SERVICE_URL = process.env.MACHINERY_SERVICE_URL || 'http://localhost:3002';
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'rentamaq-internal-key-dev';

async function autoCompleteExpiredBookings() {
    try {
        const expired = await reservaRepository.findExpiredBookings();

        if (expired.length === 0) return;

        logger.info(`Procesando ${expired.length} reservas vencidas para auto-completar`);

        for (const booking of expired) {
            try {
                await reservaRepository.withTransaction(async (client) => {
                    await reservaRepository.updateEstado(booking.id, 'completada', client);

                    await eventBus.publishEvent(EVENT_TYPES.BOOKING.COMPLETED, {
                        reserva_id: booking.id,
                        maquinaria_id: booking.maquinaria_id,
                        arrendatario_id: booking.arrendatario_id,
                        propietario_id: booking.propietario_id,
                    });
                });

                try {
                    await axios.patch(
                        `${MACHINERY_SERVICE_URL}/internal/${booking.maquinaria_id}/disponible`,
                        { disponible: true },
                        {
                            headers: { 'x-api-key': INTERNAL_API_KEY, 'Content-Type': 'application/json' },
                            timeout: 5000,
                        }
                    );
                } catch (err) {
                    logger.error(`Error al disponibilizar maquinaria ${booking.maquinaria_id}:`, { message: err.message });
                }

                await releasePayment(booking.id);

                logger.info(`Reserva ${booking.id} auto-completada, maquinaria ${booking.maquinaria_id} disponible, pago liberado`);
            } catch (err) {
                logger.error(`Error al procesar reserva ${booking.id}:`, { message: err.message });
            }
        }
    } catch (err) {
        logger.error('Error en auto-completar reservas:', { message: err.message });
    }
}

async function releasePayment(bookingId) {
    const url = `${PAYMENT_SERVICE_URL}/internal/booking/${bookingId}/release`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'x-api-key': INTERNAL_API_KEY, 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
            logger.warn('No se pudo liberar el pago automáticamente:', { status: response.status, bookingId });
        }
    } catch (err) {
        logger.error('Error al liberar pago automático:', { message: err.message, bookingId });
    }
}

function start() {
    logger.info('Iniciando scheduler de auto-completar reservas (cada 10 minutos)');
    cron.schedule('*/10 * * * *', () => {
        autoCompleteExpiredBookings();
    });
    autoCompleteExpiredBookings();
}

module.exports = { start, autoCompleteExpiredBookings };
