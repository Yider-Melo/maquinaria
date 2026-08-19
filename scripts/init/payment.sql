CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS pago (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reserva_id UUID NOT NULL,
    usuario_id UUID NOT NULL,
    propietario_id UUID,
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
CREATE INDEX IF NOT EXISTS idx_pago_propietario ON pago(propietario_id);
CREATE INDEX IF NOT EXISTS idx_pago_estado ON pago(estado);
CREATE INDEX IF NOT EXISTS idx_pago_referencia ON pago(referencia_pasarela);
ALTER TABLE pago ADD COLUMN IF NOT EXISTS propietario_id UUID;
ALTER TABLE pago ADD COLUMN IF NOT EXISTS referencia_pasarela_mp VARCHAR(255);
ALTER TABLE pago ADD COLUMN IF NOT EXISTS checkout_url TEXT;
ALTER TABLE pago ADD COLUMN IF NOT EXISTS comision DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE pago ADD COLUMN IF NOT EXISTS monto_propietario DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE pago ADD COLUMN IF NOT EXISTS payout_estado VARCHAR(20) DEFAULT 'pendiente';
ALTER TABLE pago ADD COLUMN IF NOT EXISTS payout_intentos INTEGER DEFAULT 0;
ALTER TABLE pago ADD COLUMN IF NOT EXISTS payout_error TEXT;
ALTER TABLE pago ADD COLUMN IF NOT EXISTS payout_completado_en TIMESTAMP;
ALTER TABLE pago ADD COLUMN IF NOT EXISTS payout_id VARCHAR(255);
ALTER TABLE pago ADD COLUMN IF NOT EXISTS liberado_en TIMESTAMP;

CREATE TABLE IF NOT EXISTS movimiento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pago_id UUID NOT NULL REFERENCES pago(id) ON DELETE CASCADE,
    reserva_id UUID NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('comision_plataforma', 'pago_propietario', 'reembolso', 'ajuste')),
    monto DECIMAL(12, 2) NOT NULL,
    descripcion TEXT,
    referencia_tipo VARCHAR(50),
    referencia_id VARCHAR(255),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_movimiento_pago ON movimiento(pago_id);
CREATE INDEX IF NOT EXISTS idx_movimiento_tipo ON movimiento(tipo);
