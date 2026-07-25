CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS calificacion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reserva_id UUID NOT NULL,
    maquinaria_id UUID NOT NULL,
    calificador_id UUID NOT NULL,
    calificado_id UUID NOT NULL,
    puntuacion INT NOT NULL CHECK (puntuacion >= 1 AND puntuacion <= 5),
    puntuacion_maquinaria INT CHECK (puntuacion_maquinaria >= 1 AND puntuacion_maquinaria <= 5),
    comentario TEXT,
    reportado BOOLEAN DEFAULT FALSE,
    motivo_reporte TEXT,
    editado BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE calificacion ADD COLUMN IF NOT EXISTS editado BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_calificacion_calificado ON calificacion(calificado_id);
CREATE INDEX IF NOT EXISTS idx_calificacion_calificador ON calificacion(calificador_id);
CREATE INDEX IF NOT EXISTS idx_calificacion_maquinaria ON calificacion(maquinaria_id);
CREATE INDEX IF NOT EXISTS idx_calificacion_reserva ON calificacion(reserva_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_calificacion_reserva_usuario ON calificacion(reserva_id, calificador_id);
