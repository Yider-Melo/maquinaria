-- Corrección de tildes corruptas (resultado de sembrar vía PowerShell con codificación incorrecta)
UPDATE usuarios SET apellido = 'Ríos' WHERE id = 'a2000000-0000-0000-0000-000000000002';
UPDATE usuarios SET apellido = 'Jiménez', departamento = 'Bolívar' WHERE id = 'a2000000-0000-0000-0000-000000000003';
UPDATE usuarios SET apellido = 'Martínez' WHERE id = 'a2000000-0000-0000-0000-000000000004';
UPDATE usuarios SET departamento = 'Atlántico' WHERE id = 'a2000000-0000-0000-0000-000000000005';
UPDATE usuarios SET nombre = 'María', apellido = 'Gómez' WHERE id = 'a3000000-0000-0000-0000-000000000001';
UPDATE usuarios SET nombre = 'Andrés' WHERE id = 'a3000000-0000-0000-0000-000000000002';
UPDATE usuarios SET nombre = 'Sofía', apellido = 'López' WHERE id = 'a3000000-0000-0000-0000-000000000003';
