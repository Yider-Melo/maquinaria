-- =============================================
-- Seed Data Completo
-- Password para todos: Password123
-- Hash: $2a$12$wHVG9rLT1/hBNTh4Lr5SBu6/GlXJSvsDvAKnhut.Mqsi13.NS/you
-- =============================================

\c rentamaq_auth;

TRUNCATE refresh_tokens, usuarios CASCADE;

INSERT INTO usuarios (id, email, password_hash, nombre, apellido, telefono, tipo_usuario, email_verificado, activo)
VALUES
    -- Admin
    ('a0000000-0000-0000-0000-000000000001', 'admin@rentamaq.com', '$2a$12$wHVG9rLT1/hBNTh4Lr5SBu6/GlXJSvsDvAKnhut.Mqsi13.NS/you', 'Admin', 'Sistema', '3000000001', 'admin', true, true),
    -- 4 Propietarios
    ('a0000000-0000-0000-0000-000000000010', 'carlos.molina@email.com', '$2a$12$wHVG9rLT1/hBNTh4Lr5SBu6/GlXJSvsDvAKnhut.Mqsi13.NS/you', 'Carlos', 'Molina', '3001000001', 'propietario', true, true),
    ('a0000000-0000-0000-0000-000000000011', 'ana.lopez@email.com', '$2a$12$wHVG9rLT1/hBNTh4Lr5SBu6/GlXJSvsDvAKnhut.Mqsi13.NS/you', 'Ana', 'Lopez', '3001000002', 'propietario', true, true),
    ('a0000000-0000-0000-0000-000000000012', 'pedro.ramirez@email.com', '$2a$12$wHVG9rLT1/hBNTh4Lr5SBu6/GlXJSvsDvAKnhut.Mqsi13.NS/you', 'Pedro', 'Ramirez', '3001000003', 'propietario', true, true),
    ('a0000000-0000-0000-0000-000000000013', 'laura.fernandez@email.com', '$2a$12$wHVG9rLT1/hBNTh4Lr5SBu6/GlXJSvsDvAKnhut.Mqsi13.NS/you', 'Laura', 'Fernandez', '3001000004', 'propietario', true, true),
    -- 3 Arrendatarios
    ('a0000000-0000-0000-0000-000000000020', 'juan.perez@email.com', '$2a$12$wHVG9rLT1/hBNTh4Lr5SBu6/GlXJSvsDvAKnhut.Mqsi13.NS/you', 'Juan', 'Perez', '3002000001', 'arrendatario', true, true),
    ('a0000000-0000-0000-0000-000000000021', 'sofia.torres@email.com', '$2a$12$wHVG9rLT1/hBNTh4Lr5SBu6/GlXJSvsDvAKnhut.Mqsi13.NS/you', 'Sofia', 'Torres', '3002000002', 'arrendatario', true, true),
    ('a0000000-0000-0000-0000-000000000022', 'diego.martinez@email.com', '$2a$12$wHVG9rLT1/hBNTh4Lr5SBu6/GlXJSvsDvAKnhut.Mqsi13.NS/you', 'Diego', 'Martinez', '3002000003', 'arrendatario', true, true);

-- =============================================
-- Machinery DB
-- =============================================
\c rentamaq_machinery;

TRUNCATE disponibilidad_maquinaria, imagen_maquinaria, maquinaria CASCADE;

-- Insertar 5 máquinas por cada propietario (20 máquinas)

-- Carlos Molina (propietario 1) - Maquinaria pesada
INSERT INTO maquinaria (id, propietario_id, titulo, descripcion, tipo, marca, modelo, anio, capacidad, estado, precio_por_dia, ubicacion_lat, ubicacion_lng, ciudad, departamento, disponible, activo)
VALUES
     ('b1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000010', 'Excavadora CAT 320D', 'Excavadora hidraulica Caterpillar 320D en excelente estado, ideal para construccion y mineria', 'Excavadora', 'Caterpillar', '320D', 2020, '20 toneladas', 'excelente', 850000, 6.2447500, -75.5745000, 'Medellin', 'Antioquia', true, true),
     ('b1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000010', 'Retroexcavadora JCB 3CX', 'Retroexcavadora JCB 3CX con martillo y cucharon, perfecta para obras viales', 'Retroexcavadora', 'JCB', '3CX', 2021, '8 toneladas', 'excelente', 520000, 6.2528000, -75.5689000, 'Medellin', 'Antioquia', true, true),
     ('b1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000010', 'Bulldozer Komatsu D155', 'Bulldozer Komatsu D155 para movimiento de tierra a gran escala', 'Bulldozer', 'Komatsu', 'D155', 2019, '35 toneladas', 'bueno', 1200000, 6.2385000, -75.5921000, 'Medellin', 'Antioquia', true, true),
     ('b1000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000010', 'Montacargas Yale 5tn', 'Montacargas Yale de 5 toneladas para bodega e industria', 'Montacargas', 'Yale', 'GDP50MX', 2022, '5 toneladas', 'nuevo', 320000, 6.2450000, -75.5800000, 'Medellin', 'Antioquia', true, true),
     ('b1000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000010', 'Volqueta International 2021', 'Volqueta International de 15m3 para transporte de materiales', 'Volqueta', 'International', 'HX520', 2021, '15 metros cubicos', 'excelente', 450000, 6.2410000, -75.5690000, 'Medellin', 'Antioquia', true, true);

-- Ana Lopez (propietario 2) - Maquinaria de construccion
INSERT INTO maquinaria (id, propietario_id, titulo, descripcion, tipo, marca, modelo, anio, capacidad, estado, precio_por_dia, ubicacion_lat, ubicacion_lng, ciudad, departamento, disponible, activo)
VALUES
     ('b1000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000011', 'Grup TEREX RT555', 'Grua todoterreno TEREX RT555 de 55 toneladas', 'Grua', 'TEREX', 'RT555', 2020, '55 toneladas', 'excelente', 2500000, 4.7110000, -74.0721000, 'Bogota', 'Cundinamarca', true, true),
     ('b1000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000011', 'Compactadora BOMAG BW211', 'Rodillo compactador BOMAG para asfalto y suelos', 'Compactadora', 'BOMAG', 'BW211', 2020, '11 toneladas', 'bueno', 380000, 4.7050000, -74.0680000, 'Bogota', 'Cundinamarca', true, true),
     ('b1000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000011', 'Motoniveladora CAT 140K', 'Motoniveladora Caterpillar 140K para nivelacion de terrenos', 'Motoniveladora', 'Caterpillar', '140K', 2021, '18 toneladas', 'nuevo', 780000, 4.6970000, -74.0550000, 'Bogota', 'Cundinamarca', true, true),
     ('b1000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000011', 'Minicargador Bobcat S770', 'Minicargador Bobcat S770 con accesorios multiples', 'Minicargador', 'Bobcat', 'S770', 2022, '3 toneladas', 'nuevo', 290000, 4.7150000, -74.0800000, 'Bogota', 'Cundinamarca', true, true),
     ('b1000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000011', 'Martillo hidraulico Indeco', 'Martillo hidraulico Indeco para excavadora, ideal para demolicion', 'Martillo hidraulico', 'Indeco', 'HP 18000', 2021, '1800 kg', 'excelente', 220000, 4.7200000, -74.0750000, 'Bogota', 'Cundinamarca', true, true);

-- Pedro Ramirez (propietario 3) - Maquinaria agricola y ligera
INSERT INTO maquinaria (id, propietario_id, titulo, descripcion, tipo, marca, modelo, anio, capacidad, estado, precio_por_dia, ubicacion_lat, ubicacion_lng, ciudad, departamento, disponible, activo)
VALUES
     ('b1000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000012', 'Tractor John Deere 6120', 'Tractor agricola John Deere 6120 con implementos', 'Tractor', 'John Deere', '6120M', 2022, '120 HP', 'nuevo', 600000, 3.4372000, -76.5225000, 'Cali', 'Valle del Cauca', true, true),
     ('b1000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000012', 'Cargador frontal CAT 950', 'Cargador frontal Caterpillar 950 para cargue de materiales', 'Cargador frontal', 'Caterpillar', '950 GC', 2020, '4 metros cubicos', 'excelente', 680000, 3.4450000, -76.5300000, 'Cali', 'Valle del Cauca', true, true),
     ('b1000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000012', 'Vibrocompactador Dynapac', 'Vibrocompactador Dynapac para asfalto y base granular', 'Vibrocompactador', 'Dynapac', 'CA2500', 2019, '10 toneladas', 'bueno', 350000, 3.4510000, -76.5180000, 'Cali', 'Valle del Cauca', true, true),
     ('b1000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000012', 'Perforadora Atlas Copco', 'Perforadora de roca Atlas Copco para mineria y excavacion', 'Perforadora', 'Atlas Copco', 'ROC L8', 2020, '30 metros', 'excelente', 920000, 3.4300000, -76.5400000, 'Cali', 'Valle del Cauca', true, true),
     ('b1000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000012', 'Zanjadora Vermeer RTX', 'Zanjadora Vermeer RTX para instalacion de tuberias y cables', 'Zanjadora', 'Vermeer', 'RTX450', 2021, '450 kg', 'nuevo', 480000, 3.4380000, -76.5250000, 'Cali', 'Valle del Cauca', true, true);

-- Laura Fernandez (propietario 4) - Equipos especializados
INSERT INTO maquinaria (id, propietario_id, titulo, descripcion, tipo, marca, modelo, anio, capacidad, estado, precio_por_dia, ubicacion_lat, ubicacion_lng, ciudad, departamento, disponible, activo)
VALUES
     ('b1000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000013', 'Planta de asfalto ADM', 'Planta de asfalto ADM de produccion continua 120 tph', 'Planta de asfalto', 'ADM', 'SPL120', 2021, '120 tph', 'excelente', 4500000, 10.9870000, -74.8060000, 'Barranquilla', 'Atlantico', true, true),
     ('b1000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000013', 'Mezcladora de concreto Schwing', 'Mezcladora de concreto Schwing P750 para obras de gran volumen', 'Mezcladora de concreto', 'Schwing', 'P750', 2020, '7 metros cubicos', 'bueno', 250000, 10.9920000, -74.8120000, 'Barranquilla', 'Atlantico', true, true),
     ('b1000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000013', 'Desbrozadora profesional Husqvarna', 'Desbrozadora Husqvarna 555FX para limpieza de terrenos', 'Desbrozadora', 'Husqvarna', '555FX', 2022, '1.5 HP', 'nuevo', 85000, 10.9780000, -74.7980000, 'Barranquilla', 'Atlantico', true, true),
     ('b1000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000013', 'Cargador frontal JCB 437', 'Cargador frontal JCB 437 para manejo de materiales', 'Cargador frontal', 'JCB', '437', 2021, '3.5 metros cubicos', 'excelente', 580000, 10.9850000, -74.8000000, 'Barranquilla', 'Atlantico', true, true),
     ('b1000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000013', 'Compactadora de suelos Wacker', 'Compactadora de suelos Wacker RT820 para obras pequeñas', 'Compactadora', 'Wacker', 'RT820', 2022, '820 kg', 'nuevo', 150000, 10.9950000, -74.8100000, 'Barranquilla', 'Atlantico', true, true);
