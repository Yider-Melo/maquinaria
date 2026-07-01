-- =============================================
-- Auth Service Database
-- =============================================
CREATE DATABASE rentamaq_auth;

\c rentamaq_auth;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    tipo_usuario VARCHAR(20) NOT NULL CHECK (tipo_usuario IN ('propietario', 'arrendatario', 'admin')),
    foto_url TEXT,
    email_verificado BOOLEAN DEFAULT FALSE,
    verificado_2fa BOOLEAN DEFAULT FALSE,
    secreto_2fa VARCHAR(255),
    token_verificacion VARCHAR(255),
    token_recuperacion VARCHAR(255),
    expiracion_token_recuperacion TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE,
    ultimo_acceso TIMESTAMP,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Machinery Service Database
-- =============================================
CREATE DATABASE rentamaq_machinery;

\c rentamaq_machinery;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE maquinaria (
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
    precio_por_hora DECIMAL(12, 2),
    moneda VARCHAR(3) DEFAULT 'COP',
    ubicacion_lat DECIMAL(10, 7),
    ubicacion_lng DECIMAL(10, 7),
    direccion TEXT,
    ciudad VARCHAR(100),
    departamento VARCHAR(100),
    pais VARCHAR(50) DEFAULT 'Colombia',
    disponible BOOLEAN DEFAULT TRUE,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_maquinaria_propietario ON maquinaria(propietario_id);
CREATE INDEX idx_maquinaria_tipo ON maquinaria(tipo);
CREATE INDEX idx_maquinaria_disponible ON maquinaria(disponible);
CREATE INDEX idx_maquinaria_ubicacion ON maquinaria(ubicacion_lat, ubicacion_lng);
CREATE INDEX idx_maquinaria_activo ON maquinaria(activo);

CREATE TABLE imagen_maquinaria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    maquinaria_id UUID NOT NULL REFERENCES maquinaria(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    orden INT DEFAULT 0,
    es_portada BOOLEAN DEFAULT FALSE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_imagen_maquinaria_id ON imagen_maquinaria(maquinaria_id);

CREATE TABLE disponibilidad_maquinaria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    maquinaria_id UUID NOT NULL REFERENCES maquinaria(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    disponible BOOLEAN DEFAULT TRUE,
    UNIQUE(maquinaria_id, fecha)
);

CREATE INDEX idx_disponibilidad_maquinaria ON disponibilidad_maquinaria(maquinaria_id, fecha);

-- =============================================
-- Search Service Database (PostgreSQL con full-text search)
-- =============================================
CREATE DATABASE rentamaq_search;

\c rentamaq_search;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE maquinaria (
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

CREATE INDEX idx_indice_texto ON maquinaria USING GIN(texto_completo);
CREATE INDEX idx_indice_tipo ON maquinaria(tipo);
CREATE INDEX idx_indice_precio ON maquinaria(precio_por_dia);
CREATE INDEX idx_indice_ubicacion ON maquinaria(ubicacion_lat, ubicacion_lng);
CREATE INDEX idx_indice_disponible ON maquinaria(disponible);
CREATE INDEX idx_indice_ciudad ON maquinaria(ciudad);
CREATE INDEX idx_indice_activo ON maquinaria(activo);

-- =============================================
-- Booking Service Database
-- =============================================
CREATE DATABASE rentamaq_booking;

\c rentamaq_booking;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE reserva (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    maquinaria_id UUID NOT NULL,
    arrendatario_id UUID NOT NULL,
    propietario_id UUID NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    precio_total DECIMAL(12, 2) NOT NULL,
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('pendiente', 'confirmada', 'en_curso', 'completada', 'cancelada', 'rechazada')),
    motivo_cancelacion TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reserva_arrendatario ON reserva(arrendatario_id);
CREATE INDEX idx_reserva_propietario ON reserva(propietario_id);
CREATE INDEX idx_reserva_maquinaria ON reserva(maquinaria_id);
CREATE INDEX idx_reserva_estado ON reserva(estado);
CREATE INDEX idx_reserva_fechas ON reserva(fecha_inicio, fecha_fin);

-- =============================================
-- Payment Service Database
-- =============================================
CREATE DATABASE rentamaq_payment;

\c rentamaq_payment;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE pago (
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

CREATE INDEX idx_pago_reserva ON pago(reserva_id);
CREATE INDEX idx_pago_usuario ON pago(usuario_id);
CREATE INDEX idx_pago_estado ON pago(estado);
CREATE INDEX idx_pago_referencia ON pago(referencia_pasarela);

-- =============================================
-- Rating Service Database
-- =============================================
CREATE DATABASE rentamaq_rating;

\c rentamaq_rating;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE calificacion (
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

CREATE INDEX idx_calificacion_calificado ON calificacion(calificado_id);
CREATE INDEX idx_calificacion_calificador ON calificacion(calificador_id);
CREATE INDEX idx_calificacion_maquinaria ON calificacion(maquinaria_id);
CREATE INDEX idx_calificacion_reserva ON calificacion(reserva_id);

-- =============================================
-- Notification Service Database
-- =============================================
CREATE DATABASE rentamaq_notification;

\c rentamaq_notification;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE notificacion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    referencia_id UUID,
    referencia_tipo VARCHAR(50),
    leida BOOLEAN DEFAULT FALSE,
    leida_en TIMESTAMP,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notificacion_usuario ON notificacion(usuario_id);
CREATE INDEX idx_notificacion_leida ON notificacion(usuario_id, leida);
CREATE INDEX idx_notificacion_creado ON notificacion(creado_en);
