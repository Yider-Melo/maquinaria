# RentaMaq — Plataforma de Alquiler de Maquinaria Pesada

Sistema web completo para la gestión y alquiler de maquinaria pesada, construido con una arquitectura de microservicios.

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| **Runtime** | Node.js 20 (Alpine Linux) |
| **Backend** | Express.js 4.18 (7 microservicios) |
| **Frontend** | Angular 21.2, Angular Material, Leaflet |
| **Base de datos** | PostgreSQL 15 (una por microservicio) |
| **Mensajería** | RabbitMQ (topic exchange) |
| **API Gateway** | Express + http-proxy-middleware + Socket.IO |
| **Autenticación** | JWT, bcrypt, speakeasy (2FA TOTP) |
| **Pagos** | MercadoPago (webhooks) |
| **Validación** | Joi |
| **Contenedores** | Docker, Docker Compose |

## Arquitectura

```
                    ┌─────────────┐
                    │  Frontend   │
                    │  Angular 21 │
                    └──────┬──────┘
                           │ HTTP / WebSocket
                    ┌──────▼──────┐
                    │ API Gateway │ (puerto 3000)
                    │  JWT + Rate │
                    └──┬───┬───┬──┘
                       │   │   │
         ┌─────────────┘   │   └─────────────┐
         ▼                 ▼                 ▼
   ┌──────────┐    ┌──────────┐    ┌──────────────┐
   │  Auth    │    │Machinery │    │   Search     │
   │ :3001    │    │ :3002    │    │   :3003      │
   └──────────┘    └──────────┘    └──────────────┘
   ┌──────────┐    ┌──────────┐    ┌──────────────┐
   │ Booking  │    │ Payment  │    │   Rating     │
   │ :3004    │    │ :3005    │    │   :3006      │
   └──────────┘    └──────────┘    └──────────────┘
   ┌─────────────────┐
   │  Notification   │ (puerto 3007)
   │  + Socket.IO    │
   └─────────────────┘

         ┌──────────────────────┐
         │    RabbitMQ          │
         │  rentamaq.events     │
         └──────────────────────┘
```

Los microservicios se comunican de forma asíncrona mediante eventos publicados en RabbitMQ.

## Microservicios

| Servicio | Puerto | Descripción |
|---|---|---|
| **API Gateway** | 3000 | Proxy inverso, validación JWT, rate limiting, WebSocket |
| **Auth** | 3001 | Registro, login, 2FA, recuperación de contraseña |
| **Machinery** | 3002 | CRUD de maquinaria, imágenes, disponibilidad |
| **Search** | 3003 | Búsqueda full-text, filtros, geolocalización |
| **Booking** | 3004 | Ciclo de vida de reservas |
| **Payment** | 3005 | Integración con MercadoPago |
| **Rating** | 3006 | Calificaciones y reseñas |
| **Notification** | 3007 | Notificaciones en tiempo real (Socket.IO) |

## Funcionalidades

- **Usuarios**: registro con roles (propietario, arrendatario, admin), autenticación JWT, 2FA, recuperación de contraseña
- **Maquinaria**: publicación con fotos, disponibilidad por fecha, ubicación geográfica
- **Búsqueda**: texto completo, filtros por tipo/precio/ubicación, autocompletado, mapa interactivo
- **Reservas**: solicitud → confirmación/rechazo → pago → curso → finalización
- **Pagos**: MercadoPago con retención, liberación y reembolsos
- **Calificaciones**: puntuación 1-5 por reserva completada, reporting de reseñas
- **Notificaciones**: en tiempo real vía WebSocket para eventos de reservas
- **Admin**: panel con estadísticas, contabilidad, reportes y moderación

## Requisitos

- Node.js 20+
- Docker y Docker Compose
- PostgreSQL 15 (o usar los contenedores Docker)

## Inicio Rápido

```bash
# Clonar el repositorio
git clone <repo-url>
cd rentamaq

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Iniciar todos los servicios con Docker
docker-compose up -d

# Cargar datos demo en Docker
./scripts/seed-demo.ps1

# O en modo desarrollo (incluye frontend con live-reload)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### Inicio sin Docker

```bash
# Instalar dependencias de todos los servicios
cd shared && npm install && cd ..
cd api-gateway && npm install && cd ..
# Repetir para cada servicio en services/*

# Inicializar las bases de datos
psql -f scripts/init.sql

# Iniciar servicios (Windows)
scripts/start.bat

# O manualmente en terminales separadas
cd services/auth-service && npm run dev
cd services/machinery-service && npm run dev
# ... etc
```

## Datos de Prueba

Para cargar una demo completa con usuarios, maquinaria, imágenes, reservas, pagos y calificaciones:

```powershell
cd maquinaria
./scripts/seed-demo.ps1
```

Usuarios principales cargados por el seed:

Contraseña para todos: `test1234`

| Email | Rol |
|---|---|
| admin@rentamaq.com | admin |
| propietario@rentamaq.com | propietario |
| arrendatario@rentamaq.com | arrendatario |
| propietaria2@rentamaq.com | propietario |
| cliente2@rentamaq.com | arrendatario |

El archivo legacy `scripts/seed.sql` solo crea usuarios en la base de autenticación. Para una demo funcional usa `scripts/seed-demo.ps1`.

## Variables de Entorno (`.env`)

Usa `.env.example` como base:

```powershell
copy .env.example .env
```

| Variable | Descripción |
|---|---|
| `DB_*` | Credenciales de PostgreSQL (host, port, user, password) |
| `JWT_SECRET` | Clave secreta para firmar tokens JWT |
| `RABBITMQ_*` | Conexión a RabbitMQ |
| `MP_ACCESS_TOKEN` | Token de acceso de MercadoPago |
| `SMTP_*` | Configuración de correo para recuperación de contraseña |
| `INTERNAL_API_KEY` | Clave para comunicación interna entre servicios |

## Pruebas

```bash
# Prueba rápida de integración
node test.js

# Pruebas unitarias de cada servicio
cd api-gateway && npm test
cd services/auth-service && npm test
```

## Documentacion Tecnica

- API: `docs/API.md`
- Produccion: `docs/PRODUCTION.md`

## Licencia

MIT
