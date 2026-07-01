CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS usuarios (
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
