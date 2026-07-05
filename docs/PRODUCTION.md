# Guia de Produccion

## Variables obligatorias

- Cambiar `JWT_SECRET` y `INTERNAL_API_KEY`.
- Cambiar credenciales `DB_USER`, `DB_PASSWORD`, `RABBITMQ_USER`, `RABBITMQ_PASS`.
- Configurar `MERCADOPAGO_ACCESS_TOKEN` real antes de usar pagos reales.
- Configurar SMTP para recuperacion de contrasena.

## Seguridad

- Ejecutar detras de HTTPS.
- Restringir CORS al dominio real.
- No usar usuarios demo en produccion.
- Rotar secretos si se compartieron accidentalmente.
- Mantener rate limit en `/auth`.

## Datos

- Programar backups de volumenes PostgreSQL.
- Probar restauracion de backups.
- Separar ambientes: desarrollo, staging y produccion.

## Observabilidad

- Consumir `/health` desde el balanceador.
- En produccion agregar healthchecks con base de datos y RabbitMQ.
- Centralizar logs de contenedores.

## Deploy

- Construir imagenes con `docker-compose build`.
- Usar `.env` real, no `.env.example`.
- Ejecutar migraciones o scripts SQL antes de abrir trafico.
