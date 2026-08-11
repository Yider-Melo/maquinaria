CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE IF NOT EXISTS reserva (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    maquinaria_id UUID NOT NULL,
    arrendatario_id UUID NOT NULL,
    propietario_id UUID NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    precio_unitario DECIMAL(12, 2),
    precio_total DECIMAL(12, 2) NOT NULL,
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('pendiente', 'confirmada', 'pagada', 'en_curso', 'completada', 'cancelada', 'rechazada')),
    motivo_cancelacion TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reserva_arrendatario ON reserva(arrendatario_id);
CREATE INDEX IF NOT EXISTS idx_reserva_propietario ON reserva(propietario_id);
CREATE INDEX IF NOT EXISTS idx_reserva_maquinaria ON reserva(maquinaria_id);
CREATE INDEX IF NOT EXISTS idx_reserva_estado ON reserva(estado);
CREATE INDEX IF NOT EXISTS idx_reserva_fechas ON reserva(fecha_inicio, fecha_fin);
ALTER TABLE reserva ADD COLUMN IF NOT EXISTS precio_unitario DECIMAL(12, 2);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reserva_no_overlap') THEN
        ALTER TABLE reserva ADD CONSTRAINT reserva_no_overlap
            EXCLUDE USING gist (
                maquinaria_id WITH =,
                daterange(fecha_inicio, fecha_fin) WITH &&
            ) WHERE (estado IN ('pendiente', 'confirmada', 'pagada', 'en_curso'));
    END IF;
END $$;
