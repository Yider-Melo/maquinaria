-- Corrección de tildes corruptas en maquinaria (machinery)
-- 1) Departamentos y ciudades con ?? (seed vía PowerShell)
UPDATE maquinaria SET departamento = REPLACE(departamento, 'Bol??var', 'Bolívar') WHERE departamento LIKE '%Bol??var%';
UPDATE maquinaria SET departamento = REPLACE(departamento, 'Atl??ntico', 'Atlántico') WHERE departamento LIKE '%Atl??ntico%';
UPDATE maquinaria SET ciudad = REPLACE(ciudad, 'Medell??n', 'Medellín') WHERE ciudad LIKE '%Medell??n%';
UPDATE maquinaria SET ciudad = REPLACE(ciudad, 'Jamund??', 'Jamundí') WHERE ciudad LIKE '%Jamund??%';

-- 2) Ciudades con carácter de reemplazo (U+FFFD) creadas desde la app
UPDATE maquinaria SET ciudad = 'Medellín' WHERE id IN ('9f4b396b-2158-4694-983c-a6cb5927d789','3f281cf3-94ca-419f-b192-88e25ea0bc17');
UPDATE maquinaria SET ciudad = 'Bogotá' WHERE id IN ('50e0636e-4b36-4e1a-9ba5-d37db416759e','21df7e0e-ea60-4b18-b38a-f0a2f913314b');

-- 3) Títulos
UPDATE maquinaria SET titulo = REPLACE(titulo, 'Gr??a Liebherr LTM 1050', 'Grúa Liebherr LTM 1050') WHERE titulo LIKE '%Gr??a Liebherr LTM 1050%';
UPDATE maquinaria SET titulo = REPLACE(titulo, 'Martillo hidr??ulico Montabert', 'Martillo hidráulico Montabert') WHERE titulo LIKE '%Martillo hidr??ulico Montabert%';
UPDATE maquinaria SET titulo = REPLACE(titulo, 'Planta el??ctrica Cummins', 'Planta eléctrica Cummins') WHERE titulo LIKE '%Planta el??ctrica Cummins%';
UPDATE maquinaria SET titulo = REPLACE(titulo, 'Torre de iluminaci??n Allmand', 'Torre de iluminación Allmand') WHERE titulo LIKE '%Torre de iluminaci??n Allmand%';
UPDATE maquinaria SET titulo = REPLACE(titulo, 'Cami??n volquete Kodiak', 'Camión volquete Kodiak') WHERE titulo LIKE '%Cami??n volquete Kodiak%';
UPDATE maquinaria SET titulo = REPLACE(titulo, 'Tractor agr??cola John Deere', 'Tractor agrícola John Deere') WHERE titulo LIKE '%Tractor agr??cola John Deere%';

-- 4) Descripciones (patrones comunes)
UPDATE maquinaria SET descripcion = REPLACE(descripcion, 'hidr??ulica', 'hidráulica') WHERE descripcion LIKE '%hidr??ulica%';
UPDATE maquinaria SET descripcion = REPLACE(descripcion, 'Gr??a ', 'Grúa ') WHERE descripcion LIKE '%Gr??a %';
UPDATE maquinaria SET descripcion = REPLACE(descripcion, 'vers??til', 'versátil') WHERE descripcion LIKE '%vers??til%';
UPDATE maquinaria SET descripcion = REPLACE(descripcion, 'excavaci??n', 'excavación') WHERE descripcion LIKE '%excavaci??n%';
UPDATE maquinaria SET descripcion = REPLACE(descripcion, 'explanaci??n', 'explanación') WHERE descripcion LIKE '%explanaci??n%';
UPDATE maquinaria SET descripcion = REPLACE(descripcion, 'telesc??pica', 'telescópica') WHERE descripcion LIKE '%telesc??pica%';
UPDATE maquinaria SET descripcion = REPLACE(descripcion, 'port??til', 'portátil') WHERE descripcion LIKE '%port??til%';
UPDATE maquinaria SET descripcion = REPLACE(descripcion, 'neum??ticas', 'neumáticas') WHERE descripcion LIKE '%neum??ticas%';
UPDATE maquinaria SET descripcion = REPLACE(descripcion, 'compactaci??n', 'compactación') WHERE descripcion LIKE '%compactaci??n%';
UPDATE maquinaria SET descripcion = REPLACE(descripcion, 'miner??a', 'minería') WHERE descripcion LIKE '%miner??a%';
UPDATE maquinaria SET descripcion = REPLACE(descripcion, 'construcci??n', 'construcción') WHERE descripcion LIKE '%construcci??n%';
UPDATE maquinaria SET descripcion = REPLACE(descripcion, 'demolici??n', 'demolición') WHERE descripcion LIKE '%demolici??n%';
UPDATE maquinaria SET descripcion = REPLACE(descripcion, 'di??sel', 'diésel') WHERE descripcion LIKE '%di??sel%';
UPDATE maquinaria SET descripcion = REPLACE(descripcion, 'peque??o', 'pequeño') WHERE descripcion LIKE '%peque??o%';
UPDATE maquinaria SET descripcion = REPLACE(descripcion, 'met??licos', 'metálicos') WHERE descripcion LIKE '%met??licos%';
UPDATE maquinaria SET descripcion = REPLACE(descripcion, 'terracer??as', 'terracerías') WHERE descripcion LIKE '%terracer??as%';
UPDATE maquinaria SET descripcion = REPLACE(descripcion, 'm??vil', 'móvil') WHERE descripcion LIKE '%m??vil%';
UPDATE maquinaria SET descripcion = REPLACE(descripcion, 'el??ctrica', 'eléctrica') WHERE descripcion LIKE '%el??ctrica%';
UPDATE maquinaria SET descripcion = REPLACE(descripcion, 'l??mparas', 'lámparas') WHERE descripcion LIKE '%l??mparas%';
UPDATE maquinaria SET descripcion = REPLACE(descripcion, 'agr??colas', 'agrícolas') WHERE descripcion LIKE '%agr??colas%';
UPDATE maquinaria SET descripcion = REPLACE(descripcion, 'M??quina', 'Máquina') WHERE descripcion LIKE '%M??quina%';
UPDATE maquinaria SET descripcion = REPLACE(descripcion, 'm??ltiples', 'múltiples') WHERE descripcion LIKE '%m??ltiples%';
