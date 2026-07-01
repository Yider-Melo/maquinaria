-- =============================================
-- Seed Data - Usuarios de prueba
-- =============================================
-- Los passwords están hasheados con bcrypt (salt rounds: 12)
-- Password para todos: "test1234"
-- Hash generado para "test1234": $2a$12$IfMFdI.oVSzJYveUc9YqFuCfC5oO55Ol8RaAQEcvE4NKQ.d8cUDG6

\c rentamaq_auth;

INSERT INTO usuarios (id, email, password_hash, nombre, apellido, telefono, tipo_usuario, email_verificado, activo)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'admin@rentamaq.com', '$2a$12$IfMFdI.oVSzJYveUc9YqFuCfC5oO55Ol8RaAQEcvE4NKQ.d8cUDG6', 'Admin', 'Sistema', '3000000001', 'admin', true, true),
    ('a0000000-0000-0000-0000-000000000002', 'propietario@rentamaq.com', '$2a$12$IfMFdI.oVSzJYveUc9YqFuCfC5oO55Ol8RaAQEcvE4NKQ.d8cUDG6', 'Carlos', 'Molina', '3000000002', 'propietario', true, true),
    ('a0000000-0000-0000-0000-000000000003', 'arrendatario@rentamaq.com', '$2a$12$IfMFdI.oVSzJYveUc9YqFuCfC5oO55Ol8RaAQEcvE4NKQ.d8cUDG6', 'Maria', 'Gomez', '3000000003', 'arrendatario', true, true);
