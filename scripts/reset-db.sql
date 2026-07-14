-- ============================================================
-- Script de limpieza total de todas las bases de datos
-- Ejecutar contra cada base de datos:
--   \c rentamaq_auth; \i scripts/reset-db.sql
-- ============================================================

-- auth (rentamaq_auth)
\c rentamaq_auth
TRUNCATE TABLE usuarios CASCADE;

-- machinery (rentamaq_machinery) - orden respetando FK
\c rentamaq_machinery
TRUNCATE TABLE disponibilidad_maquinaria CASCADE;
TRUNCATE TABLE imagen_maquinaria CASCADE;
TRUNCATE TABLE maquinaria CASCADE;

-- booking (rentamaq_booking)
\c rentamaq_booking
TRUNCATE TABLE reserva CASCADE;

-- payment (rentamaq_payment)
\c rentamaq_payment
TRUNCATE TABLE pago CASCADE;

-- rating (rentamaq_rating)
\c rentamaq_rating
TRUNCATE TABLE calificacion CASCADE;

-- notification (rentamaq_notification)
\c rentamaq_notification
TRUNCATE TABLE notificacion CASCADE;

-- search (rentamaq_search)
\c rentamaq_search
TRUNCATE TABLE maquinaria CASCADE;
