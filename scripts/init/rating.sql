CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS calificacion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reserva_id UUID NOT NULL UNIQUE,
    maquinaria_id UUID NOT NULL,
    calificador_id UUID NOT NULL,
    calificado_id UUID NOT NULL,
    puntuacion INT NOT NULL CHECK (puntuacion >= 1 AND puntuacion <= 5),
    comentario TEXT,
    reportado BOOLEAN DEFAULT FALSE,
    motivo_reporte TEXT,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_calificacion_calificado ON calificacion(calificado_id);
CREATE INDEX IF NOT EXISTS idx_calificacion_calificador ON calificacion(calificador_id);
CREATE INDEX IF NOT EXISTS idx_calificacion_maquinaria ON calificacion(maquinaria_id);
CREATE INDEX IF NOT EXISTS idx_calificacion_reserva ON calificacion(reserva_id);
