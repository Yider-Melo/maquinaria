CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS maquinaria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    propietario_id UUID NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(50) NOT NULL,
    marca VARCHAR(100),
    modelo VARCHAR(100),
    anio INT,
    capacidad VARCHAR(50),
    estado VARCHAR(50) NOT NULL CHECK (estado IN ('nuevo', 'excelente', 'bueno', 'regular')),
    precio_por_dia DECIMAL(12, 2) NOT NULL,
    moneda VARCHAR(3) DEFAULT 'COP',
    ubicacion_lat DECIMAL(10, 7),
    ubicacion_lng DECIMAL(10, 7),
    direccion TEXT,
    ciudad VARCHAR(100),
    departamento VARCHAR(100),
    pais VARCHAR(50) DEFAULT 'Colombia',
    puntuacion_promedio DECIMAL(3, 2) DEFAULT 0,
    total_resenas INT DEFAULT 0,
    disponible BOOLEAN DEFAULT TRUE,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_maquinaria_propietario ON maquinaria(propietario_id);
CREATE INDEX IF NOT EXISTS idx_maquinaria_tipo ON maquinaria(tipo);
CREATE INDEX IF NOT EXISTS idx_maquinaria_disponible ON maquinaria(disponible);
CREATE INDEX IF NOT EXISTS idx_maquinaria_ubicacion ON maquinaria(ubicacion_lat, ubicacion_lng);
CREATE INDEX IF NOT EXISTS idx_maquinaria_activo ON maquinaria(activo);
CREATE TABLE IF NOT EXISTS imagen_maquinaria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    maquinaria_id UUID NOT NULL REFERENCES maquinaria(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    orden INT DEFAULT 0,
    es_portada BOOLEAN DEFAULT FALSE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_imagen_maquinaria_id ON imagen_maquinaria(maquinaria_id);
CREATE TABLE IF NOT EXISTS disponibilidad_maquinaria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    maquinaria_id UUID NOT NULL REFERENCES maquinaria(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    disponible BOOLEAN DEFAULT TRUE,
    UNIQUE(maquinaria_id, fecha)
);
CREATE INDEX IF NOT EXISTS idx_disponibilidad_maquinaria ON disponibilidad_maquinaria(maquinaria_id, fecha);
