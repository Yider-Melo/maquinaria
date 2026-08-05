$ErrorActionPreference = 'Stop'

function Invoke-SeedSql {
    param([string]$Container, [string]$Database, [string]$Sql)
    $Sql | docker exec -i $Container psql -U postgres -d $Database
}

$hash = '$2a$12$6rTXVAtAQTqtdYkIWPMBe.OZ/j3HktBGpuNAwoTPj7vT5iLAaua3G'

# ============================================================
# USUARIOS
# ID admin:   a100
# ID props:   a200 - a204
# ID arren:   a300 - a302
# ============================================================
Invoke-SeedSql 'maquinaria-auth-db-1' 'rentamaq_auth' @"
INSERT INTO usuarios (id, email, password_hash, nombre, apellido, telefono, tipo_usuario, email_verificado, activo, departamento)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'admin@rentamaq.com',          '$hash', 'Admin',    'Sistema',   '3000000001', 'admin',        true, true, 'Cundinamarca'),
  ('a2000000-0000-0000-0000-000000000001', 'carlos@rentamaq.com',         '$hash', 'Carlos',   'Molina',    '3000000002', 'propietario',  true, true, 'Antioquia'),
  ('a2000000-0000-0000-0000-000000000002', 'laura@rentamaq.com',          '$hash', 'Laura',    'Ríos',      '3000000003', 'propietario',  true, true, 'Valle del Cauca'),
  ('a2000000-0000-0000-0000-000000000003', 'pedro@rentamaq.com',          '$hash', 'Pedro',    'Jiménez',   '3000000004', 'propietario',  true, true, 'Bolívar'),
  ('a2000000-0000-0000-0000-000000000004', 'ana@rentamaq.com',            '$hash', 'Ana',      'Martínez',  '3000000005', 'propietario',  true, true, 'Santander'),
  ('a2000000-0000-0000-0000-000000000005', 'jorge@rentamaq.com',          '$hash', 'Jorge',    'Torres',    '3000000006', 'propietario',  true, true, 'Atlántico'),
  ('a3000000-0000-0000-0000-000000000001', 'maria@rentamaq.com',          '$hash', 'María',    'Gómez',     '3000000007', 'arrendatario', true, true, 'Cundinamarca'),
  ('a3000000-0000-0000-0000-000000000002', 'andres@rentamaq.com',         '$hash', 'Andrés',   'Vega',      '3000000008', 'arrendatario', true, true, 'Antioquia'),
  ('a3000000-0000-0000-0000-000000000003', 'sofia@rentamaq.com',          '$hash', 'Sofía',    'López',     '3000000009', 'arrendatario', true, true, 'Valle del Cauca')
ON CONFLICT (email) DO UPDATE SET nombre = EXCLUDED.nombre, apellido = EXCLUDED.apellido, tipo_usuario = EXCLUDED.tipo_usuario, activo = true;
"@

# ============================================================
# MAQUINARIA  (5 props x 5 máquinas = 25)
# ID: b100 - b124
# Propietarios: b1xx = Carlos, b2xx = Laura, b3xx = Pedro, b4xx = Ana, b5xx = Jorge
# ============================================================
$machinerySql = @"
INSERT INTO maquinaria (id, propietario_id, titulo, descripcion, tipo, marca, modelo, anio, capacidad, estado, precio_por_dia, ubicacion_lat, ubicacion_lng, direccion, ciudad, departamento, disponible, activo)
VALUES
-- Carlos (5 máquinas)
('b1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'Excavadora CAT 320', 'Excavadora hidráulica de 22 toneladas para movimiento de tierra.', 'excavadora', 'Caterpillar', '320', 2021, '22 ton', 'excelente', 680000, 6.2442, -75.5812, 'Cra 42 #18-30', 'Medellín', 'Antioquia', true, true),
('b1000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000001', 'Retroexcavadora JCB 3CX', 'Equipo versátil para excavación y cargue.', 'retroexcavadora', 'JCB', '3CX', 2020, '1 m³', 'bueno', 420000, 6.2500, -75.5900, 'Av Oriental #25-10', 'Medellín', 'Antioquia', true, true),
('b1000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000001', 'Bulldozer Komatsu D65', 'Topador para explanación y trabajos pesados.', 'bulldozer', 'Komatsu', 'D65', 2019, '21 ton', 'excelente', 890000, 6.2000, -75.5500, 'Zona Ind. Belén', 'Medellín', 'Antioquia', true, true),
('b1000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000001', 'Montacargas Toyota 8FG', 'Montacargas a gas para bodega.', 'montacargas', 'Toyota', '8FG25', 2022, '2.5 ton', 'nuevo', 260000, 6.2300, -75.5700, 'Bodega 12', 'Medellín', 'Antioquia', true, true),
('b1000000-0000-0000-0000-000000000005', 'a2000000-0000-0000-0000-000000000001', 'Rodillo Dynapac CA250', 'Rodillo compactador para asfalto y base.', 'rodillo', 'Dynapac', 'CA250', 2020, '10 ton', 'bueno', 550000, 6.2600, -75.5600, 'Vía Las Palmas', 'Medellín', 'Antioquia', true, true),

-- Laura (5 máquinas)
('b2000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', 'Grúa Liebherr LTM 1050', 'Grúa telescópica para montajes industriales.', 'grua', 'Liebherr', 'LTM 1050', 2019, '50 ton', 'excelente', 1250000, 3.4516, -76.5320, 'Acopi Yumbo', 'Cali', 'Valle del Cauca', true, true),
('b2000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000002', 'Minicargador Bobcat S70', 'Cargador compacto para espacios reducidos.', 'minicargador', 'Bobcat', 'S70', 2021, '0.5 m³', 'nuevo', 320000, 3.4700, -76.5100, 'Carrera 15 #30-20', 'Cali', 'Valle del Cauca', true, true),
('b2000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000002', 'Motobomba Honda WB30', 'Bomba de agua para achique y riego.', 'motobomba', 'Honda', 'WB30', 2022, '30 m³/h', 'nuevo', 85000, 3.4300, -76.5400, 'Cl 5 #12-45', 'Cali', 'Valle del Cauca', true, true),
('b2000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000002', 'Compresor Ingersoll Rand', 'Compresor de aire portátil para herramientas neumáticas.', 'compresor', 'Ingersoll Rand', 'P185W', 2020, '185 CFM', 'excelente', 190000, 3.4600, -76.5200, 'Zona Ind. Palmira', 'Palmira', 'Valle del Cauca', true, true),
('b2000000-0000-0000-0000-000000000005', 'a2000000-0000-0000-0000-000000000002', 'Vibroapisonador Wacker', 'Apisonador para compactación de zanjas.', 'apisonador', 'Wacker Neuson', 'BS60', 2021, '60 kg', 'bueno', 65000, 3.4400, -76.5500, 'Vía Jamundí', 'Jamundí', 'Valle del Cauca', true, true),

-- Pedro (5 máquinas)
('b3000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000003', 'Cargador frontal CAT 950', 'Cargador de ruedas para minería y construcción.', 'cargador', 'Caterpillar', '950', 2020, '3.5 m³', 'bueno', 750000, 10.3910, -75.4794, 'Mamonal', 'Cartagena', 'Bolívar', true, true),
('b3000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000003', 'Martillo hidráulico Montabert', 'Martillo para demolición acoplable a excavadora.', 'martillo', 'Montabert', 'V1200', 2021, '1.2 ton', 'excelente', 380000, 10.4000, -75.4800, 'Zona Franca', 'Cartagena', 'Bolívar', true, true),
('b3000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000003', 'Planta eléctrica Cummins', 'Generador diésel de respaldo.', 'planta', 'Cummins', 'C200D5', 2022, '200 kVA', 'nuevo', 480000, 10.3700, -75.4600, 'Barrio El Bosque', 'Cartagena', 'Bolívar', true, true),
('b3000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000003', 'Motocultor Yanmar YM359', 'Tractor pequeño para labranza y agricultura.', 'motocultor', 'Yanmar', 'YM359', 2021, '35 HP', 'excelente', 210000, 10.4200, -75.5000, 'Vía Turbaco', 'Turbaco', 'Bolívar', true, true),
('b3000000-0000-0000-0000-000000000005', 'a2000000-0000-0000-0000-000000000003', 'Andamio tubular', 'Juego de andamios metálicos para construcción.', 'andamio', 'Genérico', '2m', 2023, '500 kg', 'nuevo', 45000, 10.3800, -75.4900, 'Centro Histórico', 'Cartagena', 'Bolívar', true, true),

-- Ana (5 máquinas)
('b4000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000004', 'Motoniveladora CAT 140', 'Niveladora para acabado de terracerías.', 'motoniveladora', 'Caterpillar', '140', 2020, '30 ton', 'excelente', 820000, 7.1193, -73.1227, 'Girón', 'Bucaramanga', 'Santander', true, true),
('b4000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000004', 'Pavimentadora Finlay 883', 'Planta pavimentadora móvil para asfalto.', 'pavimentadora', 'Finlay', '883', 2019, '150 TPH', 'bueno', 950000, 7.1300, -73.1100, 'Zona Ind. Pedregosa', 'Bucaramanga', 'Santander', true, true),
('b4000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000004', 'Cortadora de concreto Husqvarna', 'Cortadora de pisos para juntas y demolición.', 'cortadora', 'Husqvarna', 'FS 513', 2022, '13 HP', 'nuevo', 110000, 7.1000, -73.1000, 'Cabecera', 'Bucaramanga', 'Santander', true, true),
('b4000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000004', 'Mezcladora de concreto IMER', 'Mezcladora eléctrica para obra.', 'mezcladora', 'IMER', 'Sintesi 350', 2023, '350 L', 'nuevo', 72000, 7.1400, -73.1400, 'Florida', 'Bucaramanga', 'Santander', true, true),
('b4000000-0000-0000-0000-000000000005', 'a2000000-0000-0000-0000-000000000004', 'Torre de iluminación Allmand', 'Torre portátil con 4 lámparas LED.', 'torre', 'Allmand', 'Night-Lite', 2021, '6 m', 'bueno', 180000, 7.1100, -73.1300, 'Vía Piedecuesta', 'Piedecuesta', 'Santander', true, true),

-- Jorge (5 máquinas)
('b5000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000005', 'Camión volquete Kodiak', 'Volquete para acarreo de materiales.', 'camion', 'Chevrolet', 'Kodiak', 2020, '15 m³', 'excelente', 520000, 10.9600, -74.7800, 'Vía 40', 'Barranquilla', 'Atlántico', true, true),
('b5000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000005', 'Tractor agrícola John Deere', 'Tractor para labranza y faenas agrícolas.', 'tractor', 'John Deere', '5075E', 2022, '75 HP', 'nuevo', 600000, 10.9300, -74.8000, 'Vía Juan Mina', 'Barranquilla', 'Atlántico', true, true),
('b5000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000005', 'Bomba de concreto Putzmeister', 'Bomba estacionaria para concreto.', 'bomba', 'Putzmeister', 'BSA 1005', 2021, '50 m³/h', 'excelente', 720000, 10.9800, -74.7600, 'Soledad', 'Soledad', 'Atlántico', true, true),
('b5000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000005', 'Soldadora Lincoln 305', 'Máquina de soldar multiproceso.', 'soldadora', 'Lincoln Electric', '305G', 2022, '305 A', 'nuevo', 140000, 10.9000, -74.7900, 'Malambo', 'Malambo', 'Atlántico', true, true),
('b5000000-0000-0000-0000-000000000005', 'a2000000-0000-0000-0000-000000000005', 'Montacargas Clark C25', 'Montacargas diésel para patio.', 'montacargas', 'Clark', 'C25L', 2020, '2.5 ton', 'bueno', 280000, 10.9700, -74.7700, 'Baranovista', 'Barranquilla', 'Atlántico', true, true)
ON CONFLICT (id) DO UPDATE SET titulo = EXCLUDED.titulo, descripcion = EXCLUDED.descripcion, tipo = EXCLUDED.tipo, marca = EXCLUDED.marca, modelo = EXCLUDED.modelo, precio_por_dia = EXCLUDED.precio_por_dia, direccion = EXCLUDED.direccion, ciudad = EXCLUDED.ciudad, departamento = EXCLUDED.departamento, disponible = true, activo = true;
"@
Invoke-SeedSql 'maquinaria-machinery-db-1' 'rentamaq_machinery' $machinerySql

# Imágenes para las 25 máquinas (IDs imagen: c100 - c124)
$imageUrls = @(
  'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1616432043562-3671ea2e5242?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1590759362144-e2e40b1546d7?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1601581875209-610b84e22b42?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1574958269340-fa927503f3dd?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1575505586569-646b2ca898fc?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1606761568499-6d2451b23c66?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1624969862644-791f3dc98927?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1590725140244-197786b0ee84?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1590579491624-f98f36d4c763?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1580674285054-bed31e145f59?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1587124956665-4ff306bcd10e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1607453998774-d533f65dac99?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1580674285054-bed31e145f59?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1575575440034-0e6a2630e4fc?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80'
)

# IDs máquina: b1000000-...-0001 a b5000000-...-0005 (grupo = 1..5, dentro = 1..5)
$imageValues = for ($i = 0; $i -lt 25; $i++) {
    $group = [Math]::Floor($i / 5) + 1
    $within = ($i % 5) + 1
    $mid = "b${group}000000-0000-0000-0000-00000000000${within}"
    $iid = "c${group}000000-0000-0000-0000-00000000000${within}"
    "  ('$iid', '$mid', '$($imageUrls[$i])', 0, true)"
}
$imageSql = "INSERT INTO imagen_maquinaria (id, maquinaria_id, url, orden, es_portada) VALUES`n$($imageValues -join ",`n")`nON CONFLICT (id) DO NOTHING;"
Invoke-SeedSql 'maquinaria-machinery-db-1' 'rentamaq_machinery' $imageSql

# ============================================================
# SEARCH (mismo catálogo)
# ============================================================
$searchSql = @"
INSERT INTO maquinaria (id, propietario_id, titulo, descripcion, tipo, marca, modelo, anio, capacidad, estado, precio_por_dia, ubicacion_lat, ubicacion_lng, direccion, ciudad, departamento, disponible, activo)
VALUES
('b1000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000001','Excavadora CAT 320','Excavadora hidráulica de 22 toneladas.','excavadora','Caterpillar','320',2021,'22 ton','excelente',680000,6.2442,-75.5812,'Cra 42 #18-30','Medellín','Antioquia',true,true),
('b1000000-0000-0000-0000-000000000002','a2000000-0000-0000-0000-000000000001','Retroexcavadora JCB 3CX','Equipo versátil para excavación y cargue.','retroexcavadora','JCB','3CX',2020,'1 m³','bueno',420000,6.2500,-75.5900,'Av Oriental #25-10','Medellín','Antioquia',true,true),
('b1000000-0000-0000-0000-000000000003','a2000000-0000-0000-0000-000000000001','Bulldozer Komatsu D65','Topador para explanación y trabajos pesados.','bulldozer','Komatsu','D65',2019,'21 ton','excelente',890000,6.2000,-75.5500,'Zona Ind. Belén','Medellín','Antioquia',true,true),
('b1000000-0000-0000-0000-000000000004','a2000000-0000-0000-0000-000000000001','Montacargas Toyota 8FG','Montacargas a gas para bodega.','montacargas','Toyota','8FG25',2022,'2.5 ton','nuevo',260000,6.2300,-75.5700,'Bodega 12','Medellín','Antioquia',true,true),
('b1000000-0000-0000-0000-000000000005','a2000000-0000-0000-0000-000000000001','Rodillo Dynapac CA250','Rodillo compactador para asfalto y base.','rodillo','Dynapac','CA250',2020,'10 ton','bueno',550000,6.2600,-75.5600,'Vía Las Palmas','Medellín','Antioquia',true,true),
('b2000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000002','Grúa Liebherr LTM 1050','Grúa telescópica para montajes industriales.','grua','Liebherr','LTM 1050',2019,'50 ton','excelente',1250000,3.4516,-76.5320,'Acopi Yumbo','Cali','Valle del Cauca',true,true),
('b2000000-0000-0000-0000-000000000002','a2000000-0000-0000-0000-000000000002','Minicargador Bobcat S70','Cargador compacto para espacios reducidos.','minicargador','Bobcat','S70',2021,'0.5 m³','nuevo',320000,3.4700,-76.5100,'Carrera 15 #30-20','Cali','Valle del Cauca',true,true),
('b2000000-0000-0000-0000-000000000003','a2000000-0000-0000-0000-000000000002','Motobomba Honda WB30','Bomba de agua para achique.','motobomba','Honda','WB30',2022,'30 m³/h','nuevo',85000,3.4300,-76.5400,'Cl 5 #12-45','Cali','Valle del Cauca',true,true),
('b2000000-0000-0000-0000-000000000004','a2000000-0000-0000-0000-000000000002','Compresor Ingersoll Rand','Compresor de aire portátil.','compresor','Ingersoll Rand','P185W',2020,'185 CFM','excelente',190000,3.4600,-76.5200,'Zona Ind. Palmira','Palmira','Valle del Cauca',true,true),
('b2000000-0000-0000-0000-000000000005','a2000000-0000-0000-0000-000000000002','Vibroapisonador Wacker','Apisonador para compactación de zanjas.','apisonador','Wacker Neuson','BS60',2021,'60 kg','bueno',65000,3.4400,-76.5500,'Vía Jamundí','Jamundí','Valle del Cauca',true,true),
('b3000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000003','Cargador frontal CAT 950','Cargador de ruedas para minería.','cargador','Caterpillar','950',2020,'3.5 m³','bueno',750000,10.3910,-75.4794,'Mamonal','Cartagena','Bolívar',true,true),
('b3000000-0000-0000-0000-000000000002','a2000000-0000-0000-0000-000000000003','Martillo hidráulico Montabert','Martillo para demolición.','martillo','Montabert','V1200',2021,'1.2 ton','excelente',380000,10.4000,-75.4800,'Zona Franca','Cartagena','Bolívar',true,true),
('b3000000-0000-0000-0000-000000000003','a2000000-0000-0000-0000-000000000003','Planta eléctrica Cummins','Generador diésel de respaldo.','planta','Cummins','C200D5',2022,'200 kVA','nuevo',480000,10.3700,-75.4600,'Barrio El Bosque','Cartagena','Bolívar',true,true),
('b3000000-0000-0000-0000-000000000004','a2000000-0000-0000-0000-000000000003','Motocultor Yanmar YM359','Tractor pequeño para agricultura.','motocultor','Yanmar','YM359',2021,'35 HP','excelente',210000,10.4200,-75.5000,'Vía Turbaco','Turbaco','Bolívar',true,true),
('b3000000-0000-0000-0000-000000000005','a2000000-0000-0000-0000-000000000003','Andamio tubular','Juego de andamios metálicos.','andamio','Genérico','2m',2023,'500 kg','nuevo',45000,10.3800,-75.4900,'Centro Histórico','Cartagena','Bolívar',true,true),
('b4000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000004','Motoniveladora CAT 140','Niveladora para terracerías.','motoniveladora','Caterpillar','140',2020,'30 ton','excelente',820000,7.1193,-73.1227,'Girón','Bucaramanga','Santander',true,true),
('b4000000-0000-0000-0000-000000000002','a2000000-0000-0000-0000-000000000004','Pavimentadora Finlay 883','Planta pavimentadora móvil.','pavimentadora','Finlay','883',2019,'150 TPH','bueno',950000,7.1300,-73.1100,'Zona Ind. Pedregosa','Bucaramanga','Santander',true,true),
('b4000000-0000-0000-0000-000000000003','a2000000-0000-0000-0000-000000000004','Cortadora de concreto Husqvarna','Cortadora de pisos.','cortadora','Husqvarna','FS 513',2022,'13 HP','nuevo',110000,7.1000,-73.1000,'Cabecera','Bucaramanga','Santander',true,true),
('b4000000-0000-0000-0000-000000000004','a2000000-0000-0000-0000-000000000004','Mezcladora de concreto IMER','Mezcladora eléctrica para obra.','mezcladora','IMER','Sintesi 350',2023,'350 L','nuevo',72000,7.1400,-73.1400,'Florida','Bucaramanga','Santander',true,true),
('b4000000-0000-0000-0000-000000000005','a2000000-0000-0000-0000-000000000004','Torre de iluminación Allmand','Torre portátil LED.','torre','Allmand','Night-Lite',2021,'6 m','bueno',180000,7.1100,-73.1300,'Vía Piedecuesta','Piedecuesta','Santander',true,true),
('b5000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000005','Camión volquete Kodiak','Volquete para acarreo.','camion','Chevrolet','Kodiak',2020,'15 m³','excelente',520000,10.9600,-74.7800,'Vía 40','Barranquilla','Atlántico',true,true),
('b5000000-0000-0000-0000-000000000002','a2000000-0000-0000-0000-000000000005','Tractor agrícola John Deere','Tractor para labranza.','tractor','John Deere','5075E',2022,'75 HP','nuevo',600000,10.9300,-74.8000,'Vía Juan Mina','Barranquilla','Atlántico',true,true),
('b5000000-0000-0000-0000-000000000003','a2000000-0000-0000-0000-000000000005','Bomba de concreto Putzmeister','Bomba estacionaria para concreto.','bomba','Putzmeister','BSA 1005',2021,'50 m³/h','excelente',720000,10.9800,-74.7600,'Soledad','Soledad','Atlántico',true,true),
('b5000000-0000-0000-0000-000000000004','a2000000-0000-0000-0000-000000000005','Soldadora Lincoln 305','Máquina de soldar multiproceso.','soldadora','Lincoln Electric','305G',2022,'305 A','nuevo',140000,10.9000,-74.7900,'Malambo','Malambo','Atlántico',true,true),
('b5000000-0000-0000-0000-000000000005','a2000000-0000-0000-0000-000000000005','Montacargas Clark C25','Montacargas diésel para patio.','montacargas','Clark','C25L',2020,'2.5 ton','bueno',280000,10.9700,-74.7700,'Baranovista','Barranquilla','Atlántico',true,true)
ON CONFLICT (id) DO UPDATE SET titulo = EXCLUDED.titulo, descripcion = EXCLUDED.descripcion, tipo = EXCLUDED.tipo, marca = EXCLUDED.marca, modelo = EXCLUDED.modelo, precio_por_dia = EXCLUDED.precio_por_dia, direccion = EXCLUDED.direccion, ciudad = EXCLUDED.ciudad, departamento = EXCLUDED.departamento, disponible = true, activo = true;
UPDATE maquinaria SET puntuacion_promedio = 4.8, total_resenas = 12 WHERE id = 'b1000000-0000-0000-0000-000000000001';
UPDATE maquinaria SET puntuacion_promedio = 4.5, total_resenas = 8  WHERE id = 'b2000000-0000-0000-0000-000000000001';
UPDATE maquinaria SET puntuacion_promedio = 4.9, total_resenas = 5  WHERE id = 'b3000000-0000-0000-0000-000000000001';
UPDATE maquinaria SET puntuacion_promedio = 4.7, total_resenas = 9  WHERE id = 'b4000000-0000-0000-0000-000000000001';
UPDATE maquinaria SET puntuacion_promedio = 4.3, total_resenas = 4  WHERE id = 'b5000000-0000-0000-0000-000000000001';
"@
Invoke-SeedSql 'maquinaria-search-db-1' 'rentamaq_search' $searchSql

# ============================================================
# RESERVAS (María y Andrés hacen reservas)
# ============================================================
Invoke-SeedSql 'maquinaria-booking-db-1' 'rentamaq_booking' @"
INSERT INTO reserva (id, maquinaria_id, arrendatario_id, propietario_id, fecha_inicio, fecha_fin, precio_total, estado)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', CURRENT_DATE + 3,  CURRENT_DATE + 5,  2040000, 'confirmada'),
  ('d0000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000002', CURRENT_DATE + 8,  CURRENT_DATE + 9,  1250000, 'pendiente'),
  ('d0000000-0000-0000-0000-000000000003', 'b3000000-0000-0000-0000-000000000004', 'a3000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000003', CURRENT_DATE - 12, CURRENT_DATE - 10, 420000,  'completada'),
  ('d0000000-0000-0000-0000-000000000004', 'b4000000-0000-0000-0000-000000000003', 'a3000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000004', CURRENT_DATE + 5,  CURRENT_DATE + 6,  110000,  'pendiente'),
  ('d0000000-0000-0000-0000-000000000005', 'b5000000-0000-0000-0000-000000000004', 'a3000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000005', CURRENT_DATE - 5,  CURRENT_DATE - 3,  280000,  'completada')
ON CONFLICT (id) DO UPDATE SET estado = EXCLUDED.estado, precio_total = EXCLUDED.precio_total;
"@

# ============================================================
# PAGOS
# ============================================================
Invoke-SeedSql 'maquinaria-payment-db-1' 'rentamaq_payment' @"
INSERT INTO pago (id, reserva_id, usuario_id, monto, metodo_pago, estado, referencia_pasarela, descripcion)
VALUES
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 2040000, 'tarjeta', 'retenido',   'MP-DEMO-001', 'Pago retenido'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000003', 'a3000000-0000-0000-0000-000000000001', 420000,  'pse',    'liberado',   'MP-DEMO-002', 'Pago liberado'),
  ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000005', 'a3000000-0000-0000-0000-000000000002', 280000,  'tarjeta','liberado',   'MP-DEMO-003', 'Pago liberado')
ON CONFLICT (id) DO UPDATE SET estado = EXCLUDED.estado, monto = EXCLUDED.monto;
"@

# ============================================================
# CALIFICACIONES (solo las completadas)
# ============================================================
Invoke-SeedSql 'maquinaria-rating-db-1' 'rentamaq_rating' @"
INSERT INTO calificacion (id, reserva_id, maquinaria_id, calificador_id, calificado_id, puntuacion, comentario, activo)
VALUES
  ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 'b3000000-0000-0000-0000-000000000004', 'a3000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000003', 5, 'Excelente motocultor, muy bien cuidado.', true),
  ('f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000005', 'b5000000-0000-0000-0000-000000000004', 'a3000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000005', 4, 'Buena soldadora, funcionó perfecto.', true)
ON CONFLICT (id) DO UPDATE SET puntuacion = EXCLUDED.puntuacion, comentario = EXCLUDED.comentario;
"@

Write-Host "========================================" -ForegroundColor Green
Write-Host "  DATOS DEMO CARGADOS EXITOSAMENTE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "ADMIN:" -ForegroundColor Yellow
Write-Host "  admin@rentamaq.com / test1234" -ForegroundColor White
Write-Host ""
Write-Host "PROPIETARIOS (5):" -ForegroundColor Yellow
Write-Host "  carlos@rentamaq.com  / test1234  (Medellín - 5 máquinas)" -ForegroundColor White
Write-Host "  laura@rentamaq.com   / test1234  (Cali - 5 máquinas)" -ForegroundColor White
Write-Host "  pedro@rentamaq.com   / test1234  (Cartagena - 5 máquinas)" -ForegroundColor White
Write-Host "  ana@rentamaq.com     / test1234  (Bucaramanga - 5 máquinas)" -ForegroundColor White
Write-Host "  jorge@rentamaq.com   / test1234  (Barranquilla - 5 máquinas)" -ForegroundColor White
Write-Host ""
Write-Host "ARRENDATARIOS (3):" -ForegroundColor Yellow
Write-Host "  maria@rentamaq.com   / test1234" -ForegroundColor White
Write-Host "  andres@rentamaq.com  / test1234" -ForegroundColor White
Write-Host "  sofia@rentamaq.com   / test1234" -ForegroundColor White
