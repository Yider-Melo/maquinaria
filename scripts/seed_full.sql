-- =============================================
-- SEED COMPLETO - 5 propietarios, 3 arrendatarios
-- 25 máquinas (5 c/u), 4 fotos por máquina
-- Password: Password123
-- Hash: $2a$12$wHVG9rLT1/hBNTh4Lr5SBu6/GlXJSvsDvAKnhut.Mqsi13.NS/you
-- =============================================

-- ==================== AUTH DB ====================
\c rentamaq_auth;

INSERT INTO usuarios (id, email, password_hash, nombre, apellido, telefono, tipo_usuario, email_verificado, activo)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'admin@rentamaq.com', '$2a$12$wHVG9rLT1/hBNTh4Lr5SBu6/GlXJSvsDvAKnhut.Mqsi13.NS/you', 'Admin', 'Sistema', '3000000001', 'admin', true, true),
    ('2da3f9e3-9c22-470c-8009-0b8fc778aa45', 'andres.garcia@email.com', '$2a$12$wHVG9rLT1/hBNTh4Lr5SBu6/GlXJSvsDvAKnhut.Mqsi13.NS/you', 'Andres', 'Garcia', '3001000001', 'propietario', true, true),
    ('6ba801c5-1a63-4927-be0c-34c213795cd2', 'carolina.herrera@email.com', '$2a$12$wHVG9rLT1/hBNTh4Lr5SBu6/GlXJSvsDvAKnhut.Mqsi13.NS/you', 'Carolina', 'Herrera', '3001000002', 'propietario', true, true),
    ('06cfad44-1255-4453-a99e-5f35f95293a1', 'javier.mendoza@email.com', '$2a$12$wHVG9rLT1/hBNTh4Lr5SBu6/GlXJSvsDvAKnhut.Mqsi13.NS/you', 'Javier', 'Mendoza', '3001000003', 'propietario', true, true),
    ('fbb22e2f-8f86-4197-aa02-5fe381d38d89', 'patricia.rojas@email.com', '$2a$12$wHVG9rLT1/hBNTh4Lr5SBu6/GlXJSvsDvAKnhut.Mqsi13.NS/you', 'Patricia', 'Rojas', '3001000004', 'propietario', true, true),
    ('75267dfe-7e70-40bc-a22e-376d28ae98ae', 'fernando.castro@email.com', '$2a$12$wHVG9rLT1/hBNTh4Lr5SBu6/GlXJSvsDvAKnhut.Mqsi13.NS/you', 'Fernando', 'Castro', '3001000005', 'propietario', true, true),
    ('0bc44ab9-8b82-4d4b-bf56-dc3a43829f6e', 'lucia.mejia@email.com', '$2a$12$wHVG9rLT1/hBNTh4Lr5SBu6/GlXJSvsDvAKnhut.Mqsi13.NS/you', 'Lucia', 'Mejia', '3002000001', 'arrendatario', true, true),
    ('8fe40499-aa5f-4c97-9fe8-f08d3c8dd996', 'oscar.vasquez@email.com', '$2a$12$wHVG9rLT1/hBNTh4Lr5SBu6/GlXJSvsDvAKnhut.Mqsi13.NS/you', 'Oscar', 'Vasquez', '3002000002', 'arrendatario', true, true),
    ('9dce4ec8-8c70-4060-a06e-cf7652ec453c', 'camila.moreno@email.com', '$2a$12$wHVG9rLT1/hBNTh4Lr5SBu6/GlXJSvsDvAKnhut.Mqsi13.NS/you', 'Camila', 'Moreno', '3002000003', 'arrendatario', true, true);

-- ==================== MACHINERY DB ====================
\c rentamaq_machinery;

-- Andres Garcia (propietario 1) - Maquinaria de construccion pesada
INSERT INTO maquinaria (id, propietario_id, titulo, descripcion, tipo, marca, modelo, anio, capacidad, estado, precio_por_dia, precio_por_hora, ubicacion_lat, ubicacion_lng, ciudad, departamento, disponible, activo, puntuacion_promedio, total_resenas)
VALUES
    ('143cb97a-fdd3-4724-8e7c-49df43de2644', '2da3f9e3-9c22-470c-8009-0b8fc778aa45', 'Excavadora CAT 336', 'Excavadora hidraulica de 36 toneladas para mineria y gran construccion', 'Excavadora', 'Caterpillar', '336', 2022, '36 toneladas', 'nuevo', 1200000, 180000, 4.5981, -74.0758, 'Bogota', 'Cundinamarca', true, true, 4.5, 12),
    ('51e8425b-45f2-458b-ac83-5cc1e5e664e8', '2da3f9e3-9c22-470c-8009-0b8fc778aa45', 'Bulldozer CAT D6T', 'Bulldozer sobre orugas para movimiento de tierra pesado', 'Bulldozer', 'Caterpillar', 'D6T', 2021, '20 toneladas', 'excelente', 1500000, 220000, 4.6023, -74.0801, 'Bogota', 'Cundinamarca', true, true, 4.8, 8),
    ('24b0465b-303e-4014-bd34-2f6d21303475', '2da3f9e3-9c22-470c-8009-0b8fc778aa45', 'Motoniveladora CAT 160K', 'Motoniveladora para nivelacion de terrenos y carreteras', 'Motoniveladora', 'Caterpillar', '160K', 2023, '19 toneladas', 'nuevo', 950000, 140000, 4.6105, -74.0690, 'Bogota', 'Cundinamarca', true, true, 5.0, 6),
    ('6f59334d-3ee5-41ff-8218-8212277d5e95', '2da3f9e3-9c22-470c-8009-0b8fc778aa45', 'Cargador frontal CAT 966', 'Cargador frontal de 4.5m3 para cargue de materiales', 'Cargador frontal', 'Caterpillar', '966M', 2022, '4.5 metros cubicos', 'excelente', 1100000, 160000, 4.5950, -74.0720, 'Bogota', 'Cundinamarca', true, true, 4.2, 15),
    ('2d249d43-9628-49a8-b042-9eed41e938c6', '2da3f9e3-9c22-470c-8009-0b8fc778aa45', 'Compactadora BOMAG BW215', 'Rodillo compactador tandem para asfalto de alta densidad', 'Compactadora', 'BOMAG', 'BW215', 2023, '12 toneladas', 'nuevo', 450000, 65000, 4.6080, -74.0850, 'Bogota', 'Cundinamarca', true, true, 4.0, 4);

-- Carolina Herrera (propietario 2) - Equipos de excavacion y demolicion
INSERT INTO maquinaria (id, propietario_id, titulo, descripcion, tipo, marca, modelo, anio, capacidad, estado, precio_por_dia, precio_por_hora, ubicacion_lat, ubicacion_lng, ciudad, departamento, disponible, activo, puntuacion_promedio, total_resenas)
VALUES
    ('0396fc26-fed9-4328-b963-8baee3c16633', '6ba801c5-1a63-4927-be0c-34c213795cd2', 'Excavadora John Deere 470', 'Excavadora hidraulica de 47 toneladas', 'Excavadora', 'John Deere', '470G', 2022, '47 toneladas', 'excelente', 1300000, 190000, 6.2476, -75.5958, 'Medellin', 'Antioquia', true, true, 4.6, 10),
    ('33f54d53-fc05-4d85-ae37-f0b163528a47', '6ba801c5-1a63-4927-be0c-34c213795cd2', 'Martillo hidraulico Atlas Copco', 'Martillo hidraulico para excavadora de 3.5 toneladas', 'Martillo hidraulico', 'Atlas Copco', 'MB 1500', 2023, '1500 kg', 'nuevo', 380000, 55000, 6.2500, -75.5900, 'Medellin', 'Antioquia', true, true, 4.3, 7),
    ('d5d88582-cc00-423b-848b-a458a5a6f600', '6ba801c5-1a63-4927-be0c-34c213795cd2', 'Minicargador Bobcat T870', 'Minicargador de orugas con múltiples accesorios', 'Minicargador', 'Bobcat', 'T870', 2021, '3.5 toneladas', 'bueno', 320000, 48000, 6.2420, -75.5880, 'Medellin', 'Antioquia', true, true, 4.1, 9),
    ('81c68977-3f5b-4686-b02a-59ab205e059a', '6ba801c5-1a63-4927-be0c-34c213795cd2', 'Retroexcavadora JCB 4CX', 'Retroexcavadora 4x4 con martillo y cucharon 1m3', 'Retroexcavadora', 'JCB', '4CX', 2022, '9 toneladas', 'excelente', 580000, 85000, 6.2550, -75.5820, 'Medellin', 'Antioquia', true, true, 4.7, 14),
    ('9708b4e8-d3e0-4663-ae12-9297d9027e48', '6ba801c5-1a63-4927-be0c-34c213795cd2', 'Perforadora Sandvik DX700', 'Perforadora de roca para minería y canteras', 'Perforadora', 'Sandvik', 'DX700', 2023, '40 metros', 'nuevo', 1800000, 260000, 6.2350, -75.6010, 'Medellin', 'Antioquia', true, true, 5.0, 3);

-- Javier Mendoza (propietario 3) - Maquinaria vial y transporte
INSERT INTO maquinaria (id, propietario_id, titulo, descripcion, tipo, marca, modelo, anio, capacidad, estado, precio_por_dia, precio_por_hora, ubicacion_lat, ubicacion_lng, ciudad, departamento, disponible, activo, puntuacion_promedio, total_resenas)
VALUES
    ('246af571-2d18-417c-b8de-4a4a2d2d6146', '06cfad44-1255-4453-a99e-5f35f95293a1', 'Volqueta Kenworth T880', 'Volqueta articulada de 18m3 para movimiento de tierra', 'Volqueta', 'Kenworth', 'T880', 2021, '18 metros cubicos', 'bueno', 550000, 80000, 3.4516, -76.5325, 'Cali', 'Valle del Cauca', true, true, 4.0, 11),
    ('5b2e42ef-4f3c-47df-bda0-aa9a8cee1415', '06cfad44-1255-4453-a99e-5f35f95293a1', 'Pavimentadora VOGELE 2100', 'Pavimentadora de asfalto de 8m de ancho de extendido', 'Compactadora', 'VOGELE', '2100-2', 2022, '8 metros', 'excelente', 2500000, 350000, 3.4480, -76.5280, 'Cali', 'Valle del Cauca', true, true, 4.4, 5),
    ('0f83e522-11bd-47a5-b740-ab834088192e', '06cfad44-1255-4453-a99e-5f35f95293a1', 'Extendedora de asfalto CAT AP655', 'Extendedora de concreto asfaltico para carreteras', 'Compactadora', 'Caterpillar', 'AP655', 2023, '6 metros', 'nuevo', 2200000, 310000, 3.4550, -76.5400, 'Cali', 'Valle del Cauca', true, true, 4.9, 4),
    ('4dc3148e-d6fd-4d26-aa73-8eade1cdb759', '06cfad44-1255-4453-a99e-5f35f95293a1', 'Camion grua HLAB 377', 'Camion con grua hidraulica de 7 toneladas', 'Grua', 'HLAB', '377', 2020, '7 toneladas', 'bueno', 420000, 62000, 3.4600, -76.5350, 'Cali', 'Valle del Cauca', true, true, 3.8, 8),
    ('d2d80c9e-e7a8-429e-ada2-f23328e09a87', '06cfad44-1255-4453-a99e-5f35f95293a1', 'Montacargas Clark C60', 'Montacargas de 6 toneladas para bodegas industriales', 'Montacargas', 'Clark', 'C60D', 2022, '6 toneladas', 'excelente', 280000, 42000, 3.4430, -76.5200, 'Cali', 'Valle del Cauca', true, true, 4.2, 6);

-- Patricia Rojas (propietario 4) - Equipos de agricultura y terreno
INSERT INTO maquinaria (id, propietario_id, titulo, descripcion, tipo, marca, modelo, anio, capacidad, estado, precio_por_dia, precio_por_hora, ubicacion_lat, ubicacion_lng, ciudad, departamento, disponible, activo, puntuacion_promedio, total_resenas)
VALUES
    ('52f3a189-173b-40c5-b305-50b630d31d8d', 'fbb22e2f-8f86-4197-aa02-5fe381d38d89', 'Tractor New Holland T8', 'Tractor agricola de 320 HP con cabina climatizada', 'Tractor', 'New Holland', 'T8.420', 2023, '320 HP', 'nuevo', 800000, 120000, 10.9834, -74.8050, 'Barranquilla', 'Atlantico', true, true, 4.8, 7),
    ('0a5a7217-ba64-4906-bae5-0f43943d321c', 'fbb22e2f-8f86-4197-aa02-5fe381d38d89', 'Cosechadora John Deere S780', 'Cosechadora de granos con cabezal de 9m', 'Tractor', 'John Deere', 'S780', 2022, '12 toneladas', 'excelente', 2000000, 290000, 10.9780, -74.8100, 'Barranquilla', 'Atlantico', true, true, 4.6, 9),
    ('ffb40379-0b64-4fcf-90c1-e42ea18f0f60', 'fbb22e2f-8f86-4197-aa02-5fe381d38d89', 'Tractor Massey Ferguson 7720', 'Tractor de 200 HP para labranza y cosecha', 'Tractor', 'Massey Ferguson', '7720S', 2021, '200 HP', 'bueno', 520000, 76000, 10.9900, -74.7980, 'Barranquilla', 'Atlantico', true, true, 4.1, 10),
    ('254965ea-c7f3-47d0-8dee-c4dc020c0f16', 'fbb22e2f-8f86-4197-aa02-5fe381d38d89', 'Vibrocompactador Hamm HD+', 'Rodillo vibrador tandem para capas de rodadura', 'Vibrocompactador', 'Hamm', 'HD+ 120', 2023, '12 toneladas', 'nuevo', 400000, 58000, 10.9860, -74.8020, 'Barranquilla', 'Atlantico', true, true, 4.3, 5),
    ('5c9977d9-d55b-4b76-b14c-46d172dee6ed', 'fbb22e2f-8f86-4197-aa02-5fe381d38d89', 'Desbrozadora Stihl FS560', 'Desbrozadora profesional motor 2T para limpieza de terrenos', 'Desbrozadora', 'Stihl', 'FS 560', 2024, '3.5 HP', 'nuevo', 95000, 14000, 10.9750, -74.8150, 'Barranquilla', 'Atlantico', true, true, 3.9, 3);

-- Fernando Castro (propietario 5) - Equipos especializados y demolicion
INSERT INTO maquinaria (id, propietario_id, titulo, descripcion, tipo, marca, modelo, anio, capacidad, estado, precio_por_dia, precio_por_hora, ubicacion_lat, ubicacion_lng, ciudad, departamento, disponible, activo, puntuacion_promedio, total_resenas)
VALUES
    ('e8b58ccc-4872-4e79-9720-4acc7f6763fa', '75267dfe-7e70-40bc-a22e-376d28ae98ae', 'Grau torre Potain MDT 368', 'Grau torre de 12 toneladas para construccion vertical', 'Grua', 'Potain', 'MDT 368', 2022, '12 toneladas', 'excelente', 3500000, 500000, 7.1254, -73.1198, 'Bucaramanga', 'Santander', true, true, 4.7, 8),
    ('9a2caace-8dbb-46cc-a9c0-d5ee0d42a922', '75267dfe-7e70-40bc-a22e-376d28ae98ae', 'Planta de concreto Schwing', 'Planta dosificadora de concreto de 60m3/h', 'Mezcladora de concreto', 'Schwing', 'Stetter C3', 2021, '60 m3/h', 'bueno', 5000000, 720000, 7.1300, -73.1250, 'Bucaramanga', 'Santander', true, true, 4.0, 6),
    ('471ba294-420e-4140-a756-e632e4078fcb', '75267dfe-7e70-40bc-a22e-376d28ae98ae', 'Zanjadora Tesmec TRS 1100', 'Zanjadora de rueda para zanjas profundas hasta 2m', 'Zanjadora', 'Tesmec', 'TRS 1100', 2023, '2 metros', 'nuevo', 980000, 140000, 7.1180, -73.1150, 'Bucaramanga', 'Santander', true, true, 5.0, 2),
    ('27259608-e444-403f-8e2e-3ecfc5cb98ba', '75267dfe-7e70-40bc-a22e-376d28ae98ae', 'Barredora Tennant 600', 'Barredora industrial para pavimentos y bodegas', 'Barredora', 'Tennant', '600E', 2022, '1.5 m', 'excelente', 180000, 26000, 7.1220, -73.1280, 'Bucaramanga', 'Santander', true, true, 4.4, 4),
    ('4a8c15f8-111a-4d28-b0a7-528ba319321a', '75267dfe-7e70-40bc-a22e-376d28ae98ae', 'Torre de iluminacion Ingersoll Rand', 'Torre de iluminacion LED de 9m con generador', 'Grua', 'Ingersoll Rand', 'LIGHT TOWER', 2024, '9 metros', 'nuevo', 120000, 18000, 7.1150, -73.1100, 'Bucaramanga', 'Santander', true, true, 4.1, 7);

-- ==================== IMAGENES (4 fotos por maquina, 100 registros) ====================
-- Maquinas de Andres Garcia (5 maquinas x 4 fotos = 20 imagenes)
INSERT INTO imagen_maquinaria (id, maquinaria_id, url, orden, es_portada) VALUES
('5f4c307c-c2cf-4f8c-9ce4-d6540547611f', '143cb97a-fdd3-4724-8e7c-49df43de2644', 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800', 1, true),
('ffeb4a13-1438-42b9-993a-68b3365b67f0', '143cb97a-fdd3-4724-8e7c-49df43de2644', 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800', 2, false),
('103af04c-9848-434a-baa6-ac9d2871bf6b', '143cb97a-fdd3-4724-8e7c-49df43de2644', 'https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=800', 3, false),
('080156db-1b5f-4a04-9a22-bfa44d4ad2ac', '143cb97a-fdd3-4724-8e7c-49df43de2644', 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=800', 4, false),
('ab7be29d-0cba-40ef-9cbd-8a4db85db76e', '51e8425b-45f2-458b-ac83-5cc1e5e664e8', 'https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=800', 1, true),
('e8697c35-8c5e-4af2-b9d1-aadbec6c4be7', '51e8425b-45f2-458b-ac83-5cc1e5e664e8', 'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=800', 2, false),
('9995a91a-310c-4497-a112-38960e4a1d04', '51e8425b-45f2-458b-ac83-5cc1e5e664e8', 'https://images.unsplash.com/photo-1624969863644-83d1b0e8f688?w=800', 3, false),
('9bc7c5ce-5d85-401c-9a7d-2cd94434a12f', '51e8425b-45f2-458b-ac83-5cc1e5e664e8', 'https://images.unsplash.com/photo-1611746872915-64382b5c76da?w=800', 4, false),
('0df1ed98-855d-4729-9ed9-8ac0e8499aff', '24b0465b-303e-4014-bd34-2f6d21303475', 'https://images.unsplash.com/photo-1541271696561-8a65b807c0b9?w=800', 1, true),
('f9f4a384-033e-4675-b354-21f701d3b946', '24b0465b-303e-4014-bd34-2f6d21303475', 'https://images.unsplash.com/photo-1590674899484-d5640d854c3f?w=800', 2, false),
('ab9fbe17-fa37-41fe-af6e-16e16c0f81e8', '24b0465b-303e-4014-bd34-2f6d21303475', 'https://images.unsplash.com/photo-1625044086678-cde5e729fec9?w=800', 3, false),
('a063ea4d-b21d-4cb3-a71f-3c8e23bb289e', '24b0465b-303e-4014-bd34-2f6d21303475', 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800', 4, false),
('e5b514ea-4ab1-4258-bd35-7315ad6e76c9', '6f59334d-3ee5-41ff-8218-8212277d5e95', 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800', 1, true),
('5b28decb-244e-4b30-97c9-ed1ce90336a7', '6f59334d-3ee5-41ff-8218-8212277d5e95', 'https://images.unsplash.com/photo-1605146769289-440113cc3d00?w=800', 2, false),
('fe1f6b28-4c1b-4082-a81e-3b67e368ca13', '6f59334d-3ee5-41ff-8218-8212277d5e95', 'https://images.unsplash.com/photo-1573505245944-5343fc1e0cc3?w=800', 3, false),
('640ddf56-2f64-4048-94fb-0a80d659009f', '6f59334d-3ee5-41ff-8218-8212277d5e95', 'https://images.unsplash.com/photo-1533488765986-dfa2a9939acd?w=800', 4, false),
('8da23259-25ca-4242-ad96-97d38f2166c3', '2d249d43-9628-49a8-b042-9eed41e938c6', 'https://images.unsplash.com/photo-1632224752032-1e26c3b51af0?w=800', 1, true),
('da283738-b486-4b72-a871-82828096486b', '2d249d43-9628-49a8-b042-9eed41e938c6', 'https://images.unsplash.com/photo-1624969863644-83d1b0e8f688?w=800', 2, false),
('f6eaacd1-5beb-4843-919a-7713b7db80bb', '2d249d43-9628-49a8-b042-9eed41e938c6', 'https://images.unsplash.com/photo-1590674899484-d5640d854c3f?w=800', 3, false),
('88d4b1c5-fa9b-4f20-9283-10c2a0082e6d', '2d249d43-9628-49a8-b042-9eed41e938c6', 'https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=800', 4, false);

-- Maquinas de Carolina Herrera (20 imagenes)
INSERT INTO imagen_maquinaria (id, maquinaria_id, url, orden, es_portada) VALUES
('376191da-f6e4-4a9f-a5b6-c83111462e80', '0396fc26-fed9-4328-b963-8baee3c16633', 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800', 1, true),
('d3ea41b9-853b-4f17-aa7e-7b9dca516471', '0396fc26-fed9-4328-b963-8baee3c16633', 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800', 2, false),
('f7f88382-3208-46ce-a178-44c43f8dc5c7', '0396fc26-fed9-4328-b963-8baee3c16633', 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=800', 3, false),
('66d7c63e-bbaf-42ac-bee3-e0056f2eaac2', '0396fc26-fed9-4328-b963-8baee3c16633', 'https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=800', 4, false),
('f0ee64b6-d602-4e1a-9eb7-54ca0429411a', '33f54d53-fc05-4d85-ae37-f0b163528a47', 'https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=800', 1, true),
('067fb6a7-599f-4aa5-81ea-c9c59f6f582a', '33f54d53-fc05-4d85-ae37-f0b163528a47', 'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=800', 2, false),
('21a15162-3ed5-4fc4-89d6-2864b162c378', '33f54d53-fc05-4d85-ae37-f0b163528a47', 'https://images.unsplash.com/photo-1611746872915-64382b5c76da?w=800', 3, false),
('7fdb897b-1455-4251-b466-94467b9537b0', '33f54d53-fc05-4d85-ae37-f0b163528a47', 'https://images.unsplash.com/photo-1625044086678-cde5e729fec9?w=800', 4, false),
('979aabff-3949-4be0-accd-be9750910fd9', 'd5d88582-cc00-423b-848b-a458a5a6f600', 'https://images.unsplash.com/photo-1541271696561-8a65b807c0b9?w=800', 1, true),
('1391df68-aeb9-4e4a-9e55-fa985e3bf2cc', 'd5d88582-cc00-423b-848b-a458a5a6f600', 'https://images.unsplash.com/photo-1590674899484-d5640d854c3f?w=800', 2, false),
('404ff0c0-ee6c-4f6b-922f-e01613e93c68', 'd5d88582-cc00-423b-848b-a458a5a6f600', 'https://images.unsplash.com/photo-1605146769289-4409cc113d3d?w=800', 3, false),
('6d069593-9de3-4a48-a0a3-fcdf44444ec6', 'd5d88582-cc00-423b-848b-a458a5a6f600', 'https://images.unsplash.com/photo-1533488765986-dfa2a9939acd?w=800', 4, false),
('9bf3dbfa-7b77-48d6-840f-6d761e002c48', '81c68977-3f5b-4686-b02a-59ab205e059a', 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800', 1, true),
('f2fc988f-4914-4b32-832f-e8f7fd576052', '81c68977-3f5b-4686-b02a-59ab205e059a', 'https://images.unsplash.com/photo-1573505245944-5343fc1e0cc3?w=800', 2, false),
('d78f32ca-83d1-412b-b65e-543cc33396d6', '81c68977-3f5b-4686-b02a-59ab205e059a', 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800', 3, false),
('cd1ca08d-92f3-486e-bbd2-92255df409f0', '81c68977-3f5b-4686-b02a-59ab205e059a', 'https://images.unsplash.com/photo-1632224752032-1e26c3b51af0?w=800', 4, false),
('50778f11-b76a-457d-b59c-44ebce54f3ec', '9708b4e8-d3e0-4663-ae12-9297d9027e48', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800', 1, true),
('90929add-1d62-45c8-853a-e7a2658163a5', '9708b4e8-d3e0-4663-ae12-9297d9027e48', 'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=800', 2, false),
('1f742358-4104-47b2-b11d-259821430346', '9708b4e8-d3e0-4663-ae12-9297d9027e48', 'https://images.unsplash.com/photo-1624969863644-83d1b0e8f688?w=800', 3, false),
('7aa697e9-c955-46ee-86af-755fc86ebc16', '9708b4e8-d3e0-4663-ae12-9297d9027e48', 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800', 4, false);

-- Maquinas de Javier Mendoza (20 imagenes)
INSERT INTO imagen_maquinaria (id, maquinaria_id, url, orden, es_portada) VALUES
('7f69fbe7-d684-495f-970d-d728a4847a59', '246af571-2d18-417c-b8de-4a4a2d2d6146', 'https://images.unsplash.com/photo-1541271696561-8a65b807c0b9?w=800', 1, true),
('0d1eb597-bf90-4e3f-878d-50f5fd05c7d1', '246af571-2d18-417c-b8de-4a4a2d2d6146', 'https://images.unsplash.com/photo-1590674899484-d5640d854c3f?w=800', 2, false),
('dc49c554-bb61-4560-b614-44f027c77b21', '246af571-2d18-417c-b8de-4a4a2d2d6146', 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800', 3, false),
('da9b821c-3e8d-4a44-950d-fc2a29995bd5', '246af571-2d18-417c-b8de-4a4a2d2d6146', 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800', 4, false),
('766adfc6-f666-4b31-9e2c-1480c5f4dc79', '5b2e42ef-4f3c-47df-bda0-aa9a8cee1415', 'https://images.unsplash.com/photo-1632224752032-1e26c3b51af0?w=800', 1, true),
('bd0b8858-f644-46c2-9b81-142446718f76', '5b2e42ef-4f3c-47df-bda0-aa9a8cee1415', 'https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=800', 2, false),
('dc2e9eb9-0210-426a-a517-9fe771bb7642', '5b2e42ef-4f3c-47df-bda0-aa9a8cee1415', 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=800', 3, false),
('860813a5-1a26-49ff-aa7c-114425ad413a', '5b2e42ef-4f3c-47df-bda0-aa9a8cee1415', 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800', 4, false),
('a0bbc5da-0ea5-498f-bd4c-5e9ff80ceb0d', '0f83e522-11bd-47a5-b740-ab834088192e', 'https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=800', 1, true),
('8563d5b8-fdcd-4aac-81e8-be49acc5d684', '0f83e522-11bd-47a5-b740-ab834088192e', 'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=800', 2, false),
('6e21769b-f344-44de-a8e2-1ae936af0660', '0f83e522-11bd-47a5-b740-ab834088192e', 'https://images.unsplash.com/photo-1611746872915-64382b5c76da?w=800', 3, false),
('04996738-e57c-4eb2-b643-2741aae63f5d', '0f83e522-11bd-47a5-b740-ab834088192e', 'https://images.unsplash.com/photo-1625044086678-cde5e729fec9?w=800', 4, false),
('d74dbf43-e0f3-4fbe-a9e9-d3bbeb70b9a1', '4dc3148e-d6fd-4d26-aa73-8eade1cdb759', 'https://images.unsplash.com/photo-1605146769289-4409cc113d3d?w=800', 1, true),
('811932d8-4f13-4ac0-b9c7-3a8257487784', '4dc3148e-d6fd-4d26-aa73-8eade1cdb759', 'https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=800', 2, false),
('134e3134-dc83-4a00-b4bf-b10e8fb157f0', '4dc3148e-d6fd-4d26-aa73-8eade1cdb759', 'https://images.unsplash.com/photo-1533488765986-dfa2a9939acd?w=800', 3, false),
('fc574455-a6c0-4139-8da1-a026f1b30e33', '4dc3148e-d6fd-4d26-aa73-8eade1cdb759', 'https://images.unsplash.com/photo-1624969863644-83d1b0e8f688?w=800', 4, false),
('913626b1-b581-45c8-9884-1842411630a3', 'd2d80c9e-e7a8-429e-ada2-f23328e09a87', 'https://images.unsplash.com/photo-1573505245944-5343fc1e0cc3?w=800', 1, true),
('45f3f177-8938-472b-ab82-7520aab57f11', 'd2d80c9e-e7a8-429e-ada2-f23328e09a87', 'https://images.unsplash.com/photo-1632224752032-1e26c3b51af0?w=800', 2, false),
('cb373833-3739-4466-983a-55d7313781e6', 'd2d80c9e-e7a8-429e-ada2-f23328e09a87', 'https://images.unsplash.com/photo-1590674899484-d5640d854c3f?w=800', 3, false),
('b72ed682-b411-48a7-a1c6-0a20e84645c8', 'd2d80c9e-e7a8-429e-ada2-f23328e09a87', 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800', 4, false);

-- Maquinas de Patricia Rojas (20 imagenes)
INSERT INTO imagen_maquinaria (id, maquinaria_id, url, orden, es_portada) VALUES
('40089fb1-f0f9-4d46-a8be-4b1963bb43ee', '52f3a189-173b-40c5-b305-50b630d31d8d', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800', 1, true),
('73842490-829b-4fc4-a13b-5232631f4d0a', '52f3a189-173b-40c5-b305-50b630d31d8d', 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800', 2, false),
('b3b8da6d-4b6e-4440-a98a-1f92dfa92423', '52f3a189-173b-40c5-b305-50b630d31d8d', 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800', 3, false),
('02fe0547-d20e-4009-9121-6af6cf9ab9f1', '52f3a189-173b-40c5-b305-50b630d31d8d', 'https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=800', 4, false),
('d5d5a091-b796-49b4-9980-1d6acb8ec45f', '0a5a7217-ba64-4906-bae5-0f43943d321c', 'https://images.unsplash.com/photo-1541271696561-8a65b807c0b9?w=800', 1, true),
('961e8f4e-2421-4f11-94d3-2108d04b1120', '0a5a7217-ba64-4906-bae5-0f43943d321c', 'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=800', 2, false),
('ffccec05-2e85-43f0-aa52-665c863b3132', '0a5a7217-ba64-4906-bae5-0f43943d321c', 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=800', 3, false),
('f390dd3e-8911-40b3-a1d4-65de5baf1c07', '0a5a7217-ba64-4906-bae5-0f43943d321c', 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800', 4, false),
('f173caf0-c787-468f-8881-52c92c655a1d', 'ffb40379-0b64-4fcf-90c1-e42ea18f0f60', 'https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=800', 1, true),
('aca5d27a-abec-4100-94c0-973f7338ac9e', 'ffb40379-0b64-4fcf-90c1-e42ea18f0f60', 'https://images.unsplash.com/photo-1624969863644-83d1b0e8f688?w=800', 2, false),
('6f0677a0-c488-4cb3-a261-20165dfd0c69', 'ffb40379-0b64-4fcf-90c1-e42ea18f0f60', 'https://images.unsplash.com/photo-1611746872915-64382b5c76da?w=800', 3, false),
('2e055d87-f1ae-43b7-8cf6-462fac4ccab7', 'ffb40379-0b64-4fcf-90c1-e42ea18f0f60', 'https://images.unsplash.com/photo-1533488765986-dfa2a9939acd?w=800', 4, false),
('60607350-9103-425e-b125-f1511c1afa73', '254965ea-c7f3-47d0-8dee-c4dc020c0f16', 'https://images.unsplash.com/photo-1632224752032-1e26c3b51af0?w=800', 1, true),
('631d13d9-2d6b-497b-abb4-b99cc2292cd7', '254965ea-c7f3-47d0-8dee-c4dc020c0f16', 'https://images.unsplash.com/photo-1605146769289-4409cc113d3d?w=800', 2, false),
('19dddaaa-0b6e-4f43-aa0a-33c2eaf68db8', '254965ea-c7f3-47d0-8dee-c4dc020c0f16', 'https://images.unsplash.com/photo-1590674899484-d5640d854c3f?w=800', 3, false),
('844d954a-92d8-4e70-bffa-017b03bab31c', '254965ea-c7f3-47d0-8dee-c4dc020c0f16', 'https://images.unsplash.com/photo-1625044086678-cde5e729fec9?w=800', 4, false),
('68ddd708-5ed9-43a0-bada-6b169d4c6ea9', '5c9977d9-d55b-4b76-b14c-46d172dee6ed', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800', 1, true),
('4d6fcaf5-5191-45fa-acee-652f2ed03759', '5c9977d9-d55b-4b76-b14c-46d172dee6ed', 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800', 2, false),
('3efcfa84-2e0a-4410-b920-5560ee3da320', '5c9977d9-d55b-4b76-b14c-46d172dee6ed', 'https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=800', 3, false),
('4b7f3be9-3a7e-42e7-affd-1bb782ed70cd', '5c9977d9-d55b-4b76-b14c-46d172dee6ed', 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=800', 4, false);

-- Maquinas de Fernando Castro (20 imagenes)
INSERT INTO imagen_maquinaria (id, maquinaria_id, url, orden, es_portada) VALUES
('cd486b02-9f9b-47b5-a313-c5960b56106d', 'e8b58ccc-4872-4e79-9720-4acc7f6763fa', 'https://images.unsplash.com/photo-1541271696561-8a65b807c0b9?w=800', 1, true),
('e5e40e77-a68c-4185-870d-9226515a0370', 'e8b58ccc-4872-4e79-9720-4acc7f6763fa', 'https://images.unsplash.com/photo-1605146769289-4409cc113d3d?w=800', 2, false),
('1668df0a-e017-43cd-93b7-fadf832165cb', 'e8b58ccc-4872-4e79-9720-4acc7f6763fa', 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800', 3, false),
('49ceb308-318e-477d-a85b-cc06848ff89c', 'e8b58ccc-4872-4e79-9720-4acc7f6763fa', 'https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=800', 4, false),
('6dd47419-bb36-46cf-9ba5-aec09957d0c0', '9a2caace-8dbb-46cc-a9c0-d5ee0d42a922', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800', 1, true),
('adccc483-84ee-4af3-9681-b5970a98196d', '9a2caace-8dbb-46cc-a9c0-d5ee0d42a922', 'https://images.unsplash.com/photo-1624969863644-83d1b0e8f688?w=800', 2, false),
('c0cafe2f-f9da-4fe7-b7a3-bd33581ce817', '9a2caace-8dbb-46cc-a9c0-d5ee0d42a922', 'https://images.unsplash.com/photo-1611746872915-64382b5c76da?w=800', 3, false),
('9686442d-58a3-4fbb-b7ec-0b58850b85f0', '9a2caace-8dbb-46cc-a9c0-d5ee0d42a922', 'https://images.unsplash.com/photo-1533488765986-dfa2a9939acd?w=800', 4, false),
('2ea74b32-5750-4289-af12-b99e26d049b4', '471ba294-420e-4140-a756-e632e4078fcb', 'https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=800', 1, true),
('601e3a5c-3b2b-472e-a0f2-2267489df51b', '471ba294-420e-4140-a756-e632e4078fcb', 'https://images.unsplash.com/photo-1632224752032-1e26c3b51af0?w=800', 2, false),
('ee70b55d-c7a0-4dcc-930f-3d2f232d413d', '471ba294-420e-4140-a756-e632e4078fcb', 'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=800', 3, false),
('b7ebfb92-9f4b-4620-9221-dd1e70bbd151', '471ba294-420e-4140-a756-e632e4078fcb', 'https://images.unsplash.com/photo-1590674899484-d5640d854c3f?w=800', 4, false),
('88ab5876-5085-4e93-9b2a-05187d17755e', '27259608-e444-403f-8e2e-3ecfc5cb98ba', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800', 1, true),
('5f30d922-0ba0-44e0-91ae-beb55d205ad8', '27259608-e444-403f-8e2e-3ecfc5cb98ba', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800', 2, false),
('004d4cc3-aefc-4353-ae0d-3b517b5abe23', '27259608-e444-403f-8e2e-3ecfc5cb98ba', 'https://images.unsplash.com/photo-1573505245944-5343fc1e0cc3?w=800', 3, false),
('52cfb9e2-212a-4904-895e-b1ba3eca5a85', '27259608-e444-403f-8e2e-3ecfc5cb98ba', 'https://images.unsplash.com/photo-1625044086678-cde5e729fec9?w=800', 4, false),
('8833043f-a093-4734-828e-bb468a97c216', '4a8c15f8-111a-4d28-b0a7-528ba319321a', 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800', 1, true),
('5c9977d9-d55b-5b76-b14c-46d172dee6ee', '4a8c15f8-111a-4d28-b0a7-528ba319321a', 'https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=800', 2, false),
('dc2e9eb9-0210-426a-a517-9fe771bb7643', '4a8c15f8-111a-4d28-b0a7-528ba319321a', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800', 3, false),
('a0bbc5da-0ea5-498f-bd4c-5e9ff80ceb0e', '4a8c15f8-111a-4d28-b0a7-528ba319321a', 'https://images.unsplash.com/photo-1605146769289-4409cc113d3d?w=800', 4, false);
