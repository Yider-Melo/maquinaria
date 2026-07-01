CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS pago (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reserva_id UUID NOT NULL,
    usuario_id UUID NOT NULL,
    monto DECIMAL(12, 2) NOT NULL,
    moneda VARCHAR(3) DEFAULT 'COP',
    metodo_pago VARCHAR(50),
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('pendiente', 'procesando', 'retenido', 'liberado', 'reembolsado', 'fallido')),
    referencia_pasarela VARCHAR(255),
    tipo_pasarela VARCHAR(20) DEFAULT 'mercadopago',
    descripcion TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pago_reserva ON pago(reserva_id);
CREATE INDEX IF NOT EXISTS idx_pago_usuario ON pago(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pago_estado ON pago(estado);
CREATE INDEX IF NOT EXISTS idx_pago_referencia ON pago(referencia_pasarela);
