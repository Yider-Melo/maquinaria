CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS reserva (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    maquinaria_id UUID NOT NULL,
    arrendatario_id UUID NOT NULL,
    propietario_id UUID NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    modalidad VARCHAR(10) DEFAULT 'dia' CHECK (modalidad IN ('dia', 'hora')),
    cantidad_unidades DECIMAL(10, 2) DEFAULT 1,
    precio_unitario DECIMAL(12, 2),
    precio_total DECIMAL(12, 2) NOT NULL,
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('pendiente', 'confirmada', 'en_curso', 'completada', 'cancelada', 'rechazada')),
    motivo_cancelacion TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reserva_arrendatario ON reserva(arrendatario_id);
CREATE INDEX IF NOT EXISTS idx_reserva_propietario ON reserva(propietario_id);
CREATE INDEX IF NOT EXISTS idx_reserva_maquinaria ON reserva(maquinaria_id);
CREATE INDEX IF NOT EXISTS idx_reserva_estado ON reserva(estado);
CREATE INDEX IF NOT EXISTS idx_reserva_fechas ON reserva(fecha_inicio, fecha_fin);
ALTER TABLE reserva ADD COLUMN IF NOT EXISTS modalidad VARCHAR(10) DEFAULT 'dia';
ALTER TABLE reserva ADD COLUMN IF NOT EXISTS cantidad_unidades DECIMAL(10, 2) DEFAULT 1;
ALTER TABLE reserva ADD COLUMN IF NOT EXISTS precio_unitario DECIMAL(12, 2);
