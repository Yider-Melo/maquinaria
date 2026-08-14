CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE TABLE IF NOT EXISTS maquinaria (
    id UUID PRIMARY KEY,
    propietario_id UUID NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(50),
    marca VARCHAR(100),
    modelo VARCHAR(100),
    anio INT,
    capacidad VARCHAR(50),
    estado VARCHAR(50),
    precio_por_dia DECIMAL(12, 2),
    ubicacion_lat DECIMAL(10, 7),
    ubicacion_lng DECIMAL(10, 7),
    direccion TEXT,
    ciudad VARCHAR(100),
    departamento VARCHAR(100),
    disponible BOOLEAN,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    puntuacion_promedio DECIMAL(2, 1) DEFAULT 0,
    total_resenas INT DEFAULT 0,
    texto_completo TSVECTOR,
    indexado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_indice_texto ON maquinaria USING GIN(texto_completo);
CREATE INDEX IF NOT EXISTS idx_indice_tipo ON maquinaria(tipo);
CREATE INDEX IF NOT EXISTS idx_indice_precio ON maquinaria(precio_por_dia);
CREATE INDEX IF NOT EXISTS idx_indice_ubicacion ON maquinaria(ubicacion_lat, ubicacion_lng);
CREATE INDEX IF NOT EXISTS idx_indice_disponible ON maquinaria(disponible);
CREATE INDEX IF NOT EXISTS idx_indice_ciudad ON maquinaria(ciudad);
CREATE INDEX IF NOT EXISTS idx_indice_activo ON maquinaria(activo);

-- Poblar texto_completo automáticamente (full-text search en español)
CREATE OR REPLACE FUNCTION actualizar_texto_completo() RETURNS TRIGGER AS $$
BEGIN
    NEW.texto_completo := to_tsvector('spanish',
        coalesce(NEW.titulo,'') || ' ' ||
        coalesce(NEW.descripcion,'') || ' ' ||
        coalesce(NEW.marca,'') || ' ' ||
        coalesce(NEW.modelo,'') || ' ' ||
        coalesce(NEW.tipo,''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_texto_completo ON maquinaria;
CREATE TRIGGER trg_texto_completo
    BEFORE INSERT OR UPDATE OF titulo, descripcion, marca, modelo, tipo
    ON maquinaria
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_texto_completo();

UPDATE maquinaria SET texto_completo = to_tsvector('spanish',
    coalesce(titulo,'') || ' ' ||
    coalesce(descripcion,'') || ' ' ||
    coalesce(marca,'') || ' ' ||
    coalesce(modelo,'') || ' ' ||
    coalesce(tipo,''))
WHERE texto_completo IS NULL;
