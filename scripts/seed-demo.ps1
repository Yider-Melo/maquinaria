$ErrorActionPreference = 'Stop'

function Invoke-SeedSql {
    param(
        [string]$Container,
        [string]$Database,
        [string]$Sql
    )

    $Sql | docker exec -i $Container psql -U postgres -d $Database
}

$passwordHash = '$2a$12$6rTXVAtAQTqtdYkIWPMBe.OZ/j3HktBGpuNAwoTPj7vT5iLAaua3G'

Invoke-SeedSql 'maquinaria-auth-db-1' 'rentamaq_auth' @"
INSERT INTO usuarios (id, email, password_hash, nombre, apellido, telefono, tipo_usuario, email_verificado, activo)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'admin@rentamaq.com', '$passwordHash', 'Admin', 'Sistema', '3000000001', 'admin', true, true),
  ('a0000000-0000-0000-0000-000000000002', 'propietario@rentamaq.com', '$passwordHash', 'Carlos', 'Molina', '3000000002', 'propietario', true, true),
  ('a0000000-0000-0000-0000-000000000003', 'arrendatario@rentamaq.com', '$passwordHash', 'Maria', 'Gomez', '3000000003', 'arrendatario', true, true),
  ('a0000000-0000-0000-0000-000000000004', 'propietaria2@rentamaq.com', '$passwordHash', 'Laura', 'Rios', '3000000004', 'propietario', true, true),
  ('a0000000-0000-0000-0000-000000000005', 'cliente2@rentamaq.com', '$passwordHash', 'Andres', 'Vega', '3000000005', 'arrendatario', true, true)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, nombre = EXCLUDED.nombre, apellido = EXCLUDED.apellido, tipo_usuario = EXCLUDED.tipo_usuario, activo = true;
"@

$machinerySql = @"
INSERT INTO maquinaria (id, propietario_id, titulo, descripcion, tipo, marca, modelo, anio, capacidad, estado, precio_por_dia, precio_por_hora, ubicacion_lat, ubicacion_lng, direccion, ciudad, departamento, disponible, activo)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Excavadora hidraulica CAT 320', 'Excavadora de 22 toneladas para movimiento de tierra, zanjas profundas y obras civiles exigentes.', 'excavadora', 'Caterpillar', '320', 2021, '22 toneladas', 'excelente', 680000, 95000, 4.7110000, -74.0721000, 'Zona industrial Fontibon', 'Bogota', 'Cundinamarca', true, true),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Retroexcavadora JCB 3CX', 'Equipo versatil para excavacion, cargue, urbanismo y mantenimiento vial.', 'retroexcavadora', 'JCB', '3CX', 2020, '1 m3', 'bueno', 420000, 65000, 6.2442000, -75.5812000, 'Bodega Caribe', 'Medellin', 'Antioquia', true, true),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004', 'Grua telescopica Liebherr LTM', 'Grua de alto alcance para montajes industriales y estructuras metalicas.', 'grua', 'Liebherr', 'LTM 1050', 2019, '50 toneladas', 'excelente', 1250000, 180000, 3.4516000, -76.5320000, 'Acopi Yumbo', 'Cali', 'Valle del Cauca', true, true),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'Montacargas Toyota 8FG', 'Montacargas a gas para bodegas, patios logisticos y centros de distribucion.', 'montacargas', 'Toyota', '8FG25', 2022, '2.5 toneladas', 'nuevo', 260000, 42000, 10.3910000, -75.4794000, 'Mamonal', 'Cartagena', 'Bolivar', true, true),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'Bulldozer Komatsu D65', 'Bulldozer para explanacion, conformacion de terreno y trabajo pesado.', 'bulldozer', 'Komatsu', 'D65', 2018, '21 toneladas', 'bueno', 890000, 130000, 7.1193000, -73.1227000, 'Giron', 'Bucaramanga', 'Santander', true, true)
ON CONFLICT (id) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  descripcion = EXCLUDED.descripcion,
  tipo = EXCLUDED.tipo,
  marca = EXCLUDED.marca,
  modelo = EXCLUDED.modelo,
  precio_por_dia = EXCLUDED.precio_por_dia,
  precio_por_hora = EXCLUDED.precio_por_hora,
  direccion = EXCLUDED.direccion,
  ciudad = EXCLUDED.ciudad,
  departamento = EXCLUDED.departamento,
  disponible = true,
  activo = true;
"@

Invoke-SeedSql 'maquinaria-machinery-db-1' 'rentamaq_machinery' $machinerySql

Invoke-SeedSql 'maquinaria-machinery-db-1' 'rentamaq_machinery' @"
INSERT INTO imagen_maquinaria (id, maquinaria_id, url, orden, es_portada)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=80', 0, true),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1616432043562-3671ea2e5242?auto=format&fit=crop&w=1200&q=80', 0, true),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80', 0, true),
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80', 0, true),
  ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=1200&q=80', 0, true)
ON CONFLICT (id) DO NOTHING;
"@

Invoke-SeedSql 'maquinaria-search-db-1' 'rentamaq_search' @"
INSERT INTO maquinaria (id, propietario_id, titulo, descripcion, tipo, marca, modelo, anio, capacidad, estado, precio_por_dia, ubicacion_lat, ubicacion_lng, direccion, ciudad, departamento, disponible, activo)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Excavadora hidraulica CAT 320', 'Excavadora de 22 toneladas para movimiento de tierra, zanjas profundas y obras civiles exigentes.', 'excavadora', 'Caterpillar', '320', 2021, '22 toneladas', 'excelente', 680000, 4.7110000, -74.0721000, 'Zona industrial Fontibon', 'Bogota', 'Cundinamarca', true, true),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Retroexcavadora JCB 3CX', 'Equipo versatil para excavacion, cargue, urbanismo y mantenimiento vial.', 'retroexcavadora', 'JCB', '3CX', 2020, '1 m3', 'bueno', 420000, 6.2442000, -75.5812000, 'Bodega Caribe', 'Medellin', 'Antioquia', true, true),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004', 'Grua telescopica Liebherr LTM', 'Grua de alto alcance para montajes industriales y estructuras metalicas.', 'grua', 'Liebherr', 'LTM 1050', 2019, '50 toneladas', 'excelente', 1250000, 3.4516000, -76.5320000, 'Acopi Yumbo', 'Cali', 'Valle del Cauca', true, true),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'Montacargas Toyota 8FG', 'Montacargas a gas para bodegas, patios logisticos y centros de distribucion.', 'montacargas', 'Toyota', '8FG25', 2022, '2.5 toneladas', 'nuevo', 260000, 10.3910000, -75.4794000, 'Mamonal', 'Cartagena', 'Bolivar', true, true),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'Bulldozer Komatsu D65', 'Bulldozer para explanacion, conformacion de terreno y trabajo pesado.', 'bulldozer', 'Komatsu', 'D65', 2018, '21 toneladas', 'bueno', 890000, 7.1193000, -73.1227000, 'Giron', 'Bucaramanga', 'Santander', true, true)
ON CONFLICT (id) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  descripcion = EXCLUDED.descripcion,
  tipo = EXCLUDED.tipo,
  marca = EXCLUDED.marca,
  modelo = EXCLUDED.modelo,
  precio_por_dia = EXCLUDED.precio_por_dia,
  direccion = EXCLUDED.direccion,
  ciudad = EXCLUDED.ciudad,
  departamento = EXCLUDED.departamento,
  disponible = true,
  activo = true;
UPDATE maquinaria SET puntuacion_promedio = 4.8, total_resenas = 12 WHERE id = 'b0000000-0000-0000-0000-000000000001';
UPDATE maquinaria SET puntuacion_promedio = 4.5, total_resenas = 8 WHERE id = 'b0000000-0000-0000-0000-000000000002';
UPDATE maquinaria SET puntuacion_promedio = 4.9, total_resenas = 5 WHERE id = 'b0000000-0000-0000-0000-000000000003';
UPDATE maquinaria SET puntuacion_promedio = 4.7, total_resenas = 9 WHERE id = 'b0000000-0000-0000-0000-000000000004';
UPDATE maquinaria SET puntuacion_promedio = 4.3, total_resenas = 4 WHERE id = 'b0000000-0000-0000-0000-000000000005';
"@

Invoke-SeedSql 'maquinaria-booking-db-1' 'rentamaq_booking' @"
INSERT INTO reserva (id, maquinaria_id, arrendatario_id, propietario_id, fecha_inicio, fecha_fin, precio_total, estado)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', CURRENT_DATE + 3, CURRENT_DATE + 5, 2040000, 'confirmada'),
  ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000004', CURRENT_DATE + 8, CURRENT_DATE + 9, 2500000, 'pendiente'),
  ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004', CURRENT_DATE - 12, CURRENT_DATE - 10, 780000, 'completada')
ON CONFLICT (id) DO UPDATE SET estado = EXCLUDED.estado, precio_total = EXCLUDED.precio_total;
"@

Invoke-SeedSql 'maquinaria-payment-db-1' 'rentamaq_payment' @"
INSERT INTO pago (id, reserva_id, usuario_id, monto, metodo_pago, estado, referencia_pasarela, descripcion)
VALUES
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 2040000, 'tarjeta', 'retenido', 'MP-DEMO-001', 'Pago retenido hasta completar la reserva'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 780000, 'pse', 'liberado', 'MP-DEMO-002', 'Pago liberado al propietario')
ON CONFLICT (id) DO UPDATE SET estado = EXCLUDED.estado, monto = EXCLUDED.monto;
"@

Invoke-SeedSql 'maquinaria-rating-db-1' 'rentamaq_rating' @"
INSERT INTO calificacion (id, reserva_id, maquinaria_id, calificador_id, calificado_id, puntuacion, comentario, activo)
VALUES
  ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004', 5, 'Equipo en excelente estado y entrega puntual.', true)
ON CONFLICT (id) DO UPDATE SET puntuacion = EXCLUDED.puntuacion, comentario = EXCLUDED.comentario;
"@

"Datos demo cargados. Usuarios: admin@rentamaq.com, propietario@rentamaq.com, arrendatario@rentamaq.com. Password: test1234"
