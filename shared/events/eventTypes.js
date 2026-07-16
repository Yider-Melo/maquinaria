// Constantes con los nombres de todos los eventos del sistema.
// Sigue el patron <dominio>.<accion> para usar con RabbitMQ topic exchange.
// Cada microservicio publica eventos cuando algo importante ocurre
// y otros servicios se suscriben para reaccionar.

const EVENT_TYPES = {
    AUTH: {
        USER_REGISTERED: 'auth.user.registered',
        USER_UPDATED: 'auth.user.updated',
        USER_PASSWORD_CHANGED: 'auth.user.password.changed',
        USER_DELETED: 'auth.user.deleted'
    },
    MACHINERY: {
        CREATED: 'machinery.created',
        UPDATED: 'machinery.updated',
        DELETED: 'machinery.deleted'
    },
    BOOKING: {
        CREATED: 'booking.created',
        CONFIRMED: 'booking.confirmed',
        CANCELLED: 'booking.cancelled',
        COMPLETED: 'booking.completed',
        REJECTED: 'booking.rejected'
    },
    PAYMENT: {
        PENDING: 'payment.pending',
        CONFIRMED: 'payment.confirmed',
        FAILED: 'payment.failed',
        REFUNDED: 'payment.refunded',
        RELEASED: 'payment.released',
        UPDATED: 'payment.updated'
    },
    RATING: {
        CREATED: 'rating.created',
        UPDATED: 'rating.updated'
    }
};

module.exports = EVENT_TYPES;
