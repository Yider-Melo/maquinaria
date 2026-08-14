# Análisis del Proyecto RentaMaq — Contexto para IA

Este documento consolida la arquitectura, estructura, flujos y estado actual del proyecto **RentaMaq** (plataforma de alquiler de maquinaria pesada) para que una IA pueda analizarlo a fondo sin necesidad de leer todo el código fuente.

---

## 1. Resumen general

RentaMaq es una plataforma web completa para **alquilar maquinaria de construcción** (excavadoras, retroexcavadoras, grúas, montacargas, etc.). Conecta **propietarios** (arrendadores) que publican equipos con **arrendatarios** que los reservan y pagan.

- **Backend**: arquitectura de microservicios Node.js/Express (7 servicios) + API Gateway + RabbitMQ (mensajería asíncrona).
- **Frontend**: Angular 21 (Material, Leaflet, Socket.IO client, Vitest).
- **Datos**: PostgreSQL 15 — una base de datos por microservicio (patrón database-per-service).
- **Deploy**: Docker Compose (7 servicios + 7 PostgreSQL + RabbitMQ).

Flujo principal implementado de punta a punta:
`registro → verificación de email → login → publicar maquinaria → búsqueda → reserva → confirmación → pago → ejecución → finalización → calificación → notificación`.

---

## 2. Stack tecnológico

| Capa | Tecnología |
|---|---|
| Runtime | Node.js 20 (Alpine Linux en Docker) |
| Backend | Express.js 4.18, 7 microservicios |
| Frontend | Angular 21.2, Angular Material 21, Leaflet, Socket.IO client, Vitest |
| Base de datos | PostgreSQL 15 (una por microservicio) |
| Mensajería | RabbitMQ (topic exchange `rentamaq.events`) |
| API Gateway | Express + http-proxy-middleware + Socket.IO |
| Autenticación | JWT, bcrypt (12 rounds), speakeasy (2FA TOTP) |
| Pagos | MercadoPago + Wompi (doble proveedor) |
| Validación | Joi (schemas compartidos en `shared/`) |
| Correos | nodemailer con plantillas HTML |
| Contenedores | Docker, Docker Compose |

---

## 3. Arquitectura

```
                    ┌─────────────┐
                    │  Frontend   │
                    │  Angular 21 │
                    └──────┬──────┘
                           │ HTTP / WebSocket
                    ┌──────▼──────┐
                    │ API Gateway │ (puerto 3000 → host 3100)
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
   │  Notification   │ (puerto 3007) + Socket.IO
   └─────────────────┘

         ┌──────────────────────┐
         │    RabbitMQ          │
         │  rentamaq.events     │
         └──────────────────────┘
```

**Comunicación**: los microservicios publican/consumen eventos asíncronos en RabbitMQ (ej. `machinery.created`, `machinery.updated`, `machinery.deleted`, `booking.*`). El gateway reenvía peticiones HTTP con prefijo `/api/v1`.

---

## 4. Estructura de directorios

```
maquinaria/
├── api-gateway/          # Gateway (proxy, JWT, rate-limit, WebSocket, sirve SPA en prod)
│   └── src/{index.js, routes/index.js, middleware/, config/}
├── services/
│   ├── auth-service/         # Usuarios, auth, 2FA, recuperación
│   ├── machinery-service/    # CRUD maquinaria, imágenes, disponibilidad
│   ├── search-service/       # Búsqueda ILIKE + unaccent, filtros, geolocalización
│   ├── booking-service/      # Ciclo de vida de reservas + scheduler
│   ├── payment-service/      # Pagos MP/Wompi, webhooks, retención/liberación
│   ├── rating-service/       # Calificaciones y reseñas
│   └── notification-service/ # Notificaciones in-app + email + WebSocket
│   (cada uno: src/{index.js, db.js, routes/, controllers/, services/, repositories/}, Dockerfile)
├── shared/               # Código compartido: schemas Joi, eventBus, authMiddleware, emailService, logger, errors
├── frontend/             # Angular 21 (módulos en src/app/)
│   └── src/app/{core, shared, auth, machinery, bookings, payments, ratings,
│                 notifications, profile, favorites, dashboard, admin, not-found}
├── scripts/              # init/*.sql (schemas), seed-demo.ps1, reset-db, start.bat, validate-security
├── docs/                 # API.md, PRODUCTION.md, SECURITY.md
├── docker-compose.yml    # Producción (sin frontend dev)
├── docker-compose.dev.yml# Dev (frontend con live-reload)
└── .env / .env.example   # Variables de entorno
```

---

## 5. Microservicios en detalle

### 5.1 API Gateway (puerto 3000)
- Proxy inverso con `http-proxy-middleware`, prefijo `/api/v1`.
- Rate limiting: auth 10 req/15 min, general 100 req/min en producción.
- Socket.IO con autenticación JWT en el handshake, salas privadas `user:{id}`.
- Endpoint interno `POST /_ws/notify` (con API key) para emitir notificaciones en tiempo real.
- Seguridad: Helmet, CORS por origen, compression, correlationId.
- **Sirve la SPA** desde `/app/api-gateway/public` si existe (ver sección 11 — no implementado).
- Healthcheck en `/health`.

### 5.2 Auth Service (3001)
- Registro con contraseña fuerte (mín 8, mayúscula, minúscula, número), email de verificación con token.
- Login que **bloquea si el email no está verificado** (403).
- Refresh token con rotación (30 días), logout/logout-all.
- 2FA TOTP (setup + verify con QR) — **sin enforcement ni UI**.
- Recuperación de contraseña (token 1 h, revoca sesiones al restablecer).
- Perfil CRUD (nombre, apellido, teléfono, departamento, ciudad, documento, foto), cambio de contraseña, borrado de cuenta (soft delete).
- Cuenta bancaria del propietario (para payouts).
- Endpoints admin (listado, stats, activar/desactivar).

### 5.3 Machinery Service (3002)
- CRUD de maquinaria con verificación de propiedad.
- Imágenes (agregar/eliminar/listar, portada), subidas comprimidas a base64 (data URI).
- Disponibilidad manual por fechas (`disponibilidad_maquinaria`) — **no integrada con el motor de reservas**.
- Favoritos (toggle/list/check).
- Endpoints admin (stats, all, activar/desactivar).
- Endpoints internos (disponible, rating) y eventos RabbitMQ.

### 5.4 Search Service (3003)
- Búsqueda ILIKE + `unaccent` (sin importar acentos/tildes).
- Filtros: tipo, ciudad, departamento, rango de precio, orden (precio/rating/distancia).
- Geolocalización: "cerca de mí" (geolocalización del navegador + bounding-box aproximado).
- Sugerencias/autocompletado con corrección.
- Indexación vía RabbitMQ (suscrito a `machinery.*`).
- Nota: hay columna `texto_completo TSVECTOR` + índice GIN **sin poblar** (se usa ILIKE, no full-text).

### 5.5 Booking Service (3004)
- Ciclo: `pendiente → confirmada → pagada → en_curso → completada` (+ `rechazada`, `cancelada`).
- Validación: fecha mínima 1 día después (zona Bogotá), conflicto transaccional `FOR NO KEY UPDATE`, prohibición de auto-alquiler, precio por días.
- Scheduler (cada 10 min): auto-completa reservas `pagada`/`en_curso` vencidas, re-disponibiliza y libera el pago.
- Notificaciones en cada transición.
- Endpoints admin (stats, recientes).
- **Falta**: reembolso automático al cancelar una reserva pagada (solo admin manual).

### 5.6 Payment Service (3005)
- Doble proveedor: MercadoPago y Wompi (payment links + transferencias).
- Checkout, webhooks (MP con firma HMAC `x-signature`), `simulate-approval` (solo dev).
- Retención/liberación con comisión 10%, movimientos contables (`movimiento`).
- Payouts a propietarios (manual/simulado — MercadoPago no soporta payout automático en Colombia).
- **Riesgo**: el webhook de Wompi NO valida firma (`WOMPI_EVENT_SECRET` definido pero ignorado).

### 5.7 Rating Service (3006)
- Crear (valida reserva `completada`/`pagada`, participantes, una por reserva).
- Listar (recibidas/emitidas/por maquinaria/promedio), editar (una sola vez), eliminar (soft), reportar.
- Actualiza promedio de maquinaria vía endpoint interno.
- **Falta**: moderación de reseñas reportadas (no hay endpoint admin para resolver).

### 5.8 Notification Service (3007)
- In-app + WebSocket (vía gateway `_ws/notify`) + email (templates booking/payment).
- Suscripción a eventos RabbitMQ.
- **Faltan**: emails para calificaciones/reembolsos; el WebSocket no envía `referencia_id/tipo`.

---

## 6. Bases de datos (PostgreSQL, una por servicio)

### Auth (`rentamaq_auth`)
```sql
usuarios (id UUID PK, email UNIQUE, password_hash, nombre, apellido, telefono,
          tipo_usuario CHECK('propietario','arrendatario','admin'), foto_url TEXT,
          email_verificado BOOL, verificado_2fa BOOL, secreto_2fa, token_verificacion,
          token_recuperacion, expiracion_token_recuperacion, activo BOOL,
          departamento, ciudad, numero_documento, ultimo_acceso, creado_en, actualizado_en)
refresh_tokens (id, usuario_id FK, token, expira_en, revocado, creado_en)
cuentas_bancarias (id, usuario_id FK, banco, tipo_cuenta, numero_cuenta, titular, tipo_documento, numero_documento)
```

### Machinery (`rentamaq_machinery`)
```sql
maquinaria (id UUID PK, propietario_id UUID, titulo, descripcion, tipo, marca, modelo, anio,
            capacidad, estado CHECK('nuevo','excelente','bueno','regular'),
            precio_por_dia DECIMAL, moneda DEFAULT 'COP',
            ubicacion_lat, ubicacion_lng, direccion, ciudad, departamento, pais,
            puntuacion_promedio, total_resenas, disponible, activo, creado_en, actualizado_en)
imagen_maquinaria (id, maquinaria_id FK CASCADE, url TEXT, orden, es_portada, creado_en)
disponibilidad_maquinaria (id, maquinaria_id FK, fecha DATE, disponible BOOL, UNIQUE(maquinaria_id, fecha))
```

### Search (`rentamaq_search`)
```sql
maquinaria (id UUID PK, propietario_id, titulo, descripcion, tipo, marca, modelo, anio,
            capacidad, estado, precio_por_dia, ubicacion_lat/lng, direccion, ciudad,
            departamento, disponible, activo, creado_en, puntuacion_promedio,
            total_resenas, texto_completo TSVECTOR, indexado_en)
```
(columna `texto_completo` con índice GIN — sin poblar)

### Booking (`rentamaq_booking`)
```sql
reserva (id UUID PK, maquinaria_id, arrendatario_id, propietario_id,
         fecha_inicio DATE, fecha_fin DATE, precio_unitario DECIMAL,
         precio_total DECIMAL, estado CHECK('pendiente','confirmada','pagada','en_curso',
         'completada','cancelada','rechazada'), motivo_cancelacion, creado_en, actualizado_en)
```

### Payment (`rentamaq_payment`)
```sql
pago (id UUID PK, reserva_id, usuario_id, propietario_id, monto, moneda DEFAULT 'COP',
      metodo_pago, estado CHECK('pendiente','procesando','retenido','liberado','reembolsado','fallido'),
      referencia_pasarela, tipo_pasarela DEFAULT 'mercadopago', descripcion, creado_en, actualizado_en,
      referencia_pasarela_mp, checkout_url, comision, monto_propietario,
      payout_estado, payout_intentos, payout_error, payout_completado_en, liberado_en)
movimiento (id, pago_id FK, reserva_id, tipo CHECK('comision_plataforma','pago_propietario','reembolso','ajuste'),
            monto, descripcion, referencia_tipo, referencia_id, creado_en)
```

### Rating (`rentamaq_rating`)
```sql
calificacion (id UUID PK, reserva_id, maquinaria_id, calificador_id, calificado_id,
              puntuacion INT CHECK(1-5), puntuacion_maquinaria, comentario,
              reportado BOOL, motivo_reporte, editado BOOL, activo BOOL, creado_en, actualizado_en,
              UNIQUE(reserva_id, calificador_id))
```

### Notification (`rentamaq_notification`)
```sql
notificacion (id, usuario_id, tipo, titulo, mensaje, leida BOOL, referencia_id, referencia_tipo, creado_en)
```

---

## 7. Superficie de API (gateway, prefijo `/api/v1`)

| Área | Rutas principales |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/resend-verification`, `GET /auth/verify-email/:token`, `GET /auth/profile`, `PATCH /auth/profile`, `PUT /auth/profile/password`, `POST /auth/profile/verify-email`, `POST /auth/2fa/setup`, `POST /auth/2fa/verify`, `GET/PUT/DELETE /auth/bank-account` |
| Machinery | `GET/POST /machinery`, `GET/PUT/DELETE /machinery/:id`, `POST /machinery/new`, `GET /machinery/owner`, `GET/POST/DELETE /machinery/:id/images`, `POST/DELETE /machinery/:id/favorite`, `GET /machinery/favorites/list`, `GET /machinery/:id/availability` |
| Search | `GET /search` (filtros), `GET /search/suggestions`, `GET /search/nearby`, `POST /search/index`, `DELETE /search/index/:id` |
| Bookings | `POST /bookings`, `GET /bookings/my-bookings`, `GET /bookings/my-listings`, `GET /bookings/check-availability`, `GET /bookings/machinery/:id`, `POST /bookings/:id/confirm`, `POST /bookings/:id/reject`, `POST /bookings/:id/cancel`, `POST /bookings/:id/start`, `POST /bookings/:id/complete`, `GET /bookings/:id` |
| Payments | `POST /payments`, `POST /payments/webhook`, `GET /payments/my-payments`, `GET /payments/:id`, `POST /payments/simulate-approval`, `POST /payments/:id/release`, `POST /payments/:id/refund`, admin: `/admin/payments/...` |
| Ratings | `POST /ratings`, `GET /ratings/machinery/:id`, `GET /ratings/user/:id`, `GET /ratings` (mías), `PUT /ratings/:id`, `DELETE /ratings/:id`, `POST /ratings/:id/report` |
| Notifications | `GET /notifications`, `GET /notifications/unread-count`, `PUT /notifications/:id/read`, `PUT /notifications/read-all` |
| Admin | `/admin/users`, `/admin/machinery`, `/admin/bookings`, `/admin/payments`, `/admin/ratings` |

**Endpoints definidos pero SIN uso en el frontend**: `/search/index`, `/2fa/*`, `/auth/logout`, `/auth/refresh`, `/payments/:id/refund`, `/payments/:id/release`, `/ratings/:id/report`, `/machinery/:id/availability`, `/admin/payouts/*`.

---

## 8. Autenticación y seguridad

- JWT en `Authorization: Bearer`, secret desde env (fallback hardcodeado `rentamaq-secret-key-dev`).
- Refresh token con rotación; el frontend guarda ambos en `localStorage` pero **no usa el refresh** (no hay interceptor; al expirar el access token redirige a login).
- bcrypt 12 rounds; política de contraseña fuerte.
- Rate limiting por IP (auth más estricto).
- Helmet, CORS por origen, sanitización básica (quita tags HTML), validación Joi en todas las rutas con `stripUnknown`.
- WebSocket autenticado por JWT.
- Webhook MercadoPago verificado por firma HMAC; **webhook Wompi SIN verificar**.
- Fallbacks de secretos hardcodeados (`INTERNAL_API_KEY`, `JWT_SECRET`) en dev.
- `GET /auth/users/:id` es público y expone PII (email, teléfono, documento).

---

## 9. Frontend (Angular 21)

Módulos en `frontend/src/app/`:
- **core**: `api.service` (HttpClient con timeout 30s + retry 1 + caché), `auth.service`, `socket.service` (Socket.IO), guards (auth, role, can-deactivate), interceptors (auth agrega token, error redirige a login en 401, logging), `models.ts`, `detail.resolver`.
- **shared**: header (nav por rol + menú "Más" + CTA "Alquilar ahora" + notificaciones con badge), footer, loading, skeleton-card, breadcrumb, `RevealDirective` (animación de aparición al hacer scroll), confirm-dialog, pipes (fecha, id, estado), `colombia-data`, `image-utils` (compresión base64).
- **auth**: login, register (con aviso de verificación), verify-email (valida token por URL), forgot-password, reset-password.
- **machinery**: list (filtros ciudad/categoría/precio, sugerencias, "cerca de mí", paginación), detail (galería, ficha técnica, calendario de disponibilidad, solicitar reserva, calificaciones paginadas con barras de distribución), form (crear/editar con mapa Leaflet), map.
- **bookings**: list (tabs arrendatario/propietario, acciones por estado), detail.
- **payments**: list, detail, status.
- **ratings**: list (recibidas/emitidas/pendientes), form.
- **notifications**: list con estados.
- **profile**: pestañas Perfil/Arrendatario/Propietario, historial, métricas, cuenta bancaria, fotos.
- **favorites**: standalone.
- **dashboard**: welcome, KPIs, paneles por rol, acciones rápidas.
- **admin**: dashboard (stats), accounting, performance, reports, usuarios-maquinas.
- **not-found**: 404.

**UX aplicada**: microinteracciones, feedback táctil (botones se comprimen al presionar), transiciones CSS, revelado progresivo al scroll (directiva `appReveal`), lazy-loading de rutas (loadChildren) e imágenes (`loading="lazy"`), CTA persistente "Alquilar ahora" en el header, ley de Fitts (botones ≥44px), arquitectura de información por rol, escaneabilidad (ficha técnica con viñetas).

---

## 10. Flujos de negocio principales

### 10.1 Registro y verificación
1. El usuario se registra (rol propietario o arrendatario).
2. El backend genera un token y envía un correo con enlace `${PUBLIC_URL}/auth/verify-email?token=...`.
3. El usuario hace clic → página Angular lee el token y llama `GET /auth/verify-email/:token`.
4. **El login está bloqueado (403) hasta que el email esté verificado**.
5. Si el usuario perdió el correo, puede "Reenviar enlace" desde el login (`POST /auth/resend-verification`).

### 10.2 Publicar y buscar
1. Propietario publica maquinaria (fotos, precio diario, ubicación con mapa).
2. Se emiten eventos RabbitMQ → el search-service indexa.
3. Arrendatario busca/filtra; el listado muestra tarjetas con disponibilidad y rating.

### 10.3 Reservar
1. En el detalle, el arrendatario selecciona fechas (calendario marca ocupadas) y modalidad.
2. Se verifica disponibilidad y se calcula el total (precio × días + IVA 19% + cuota).
3. Se crea la reserva (`pendiente`) y se notifica al propietario.
4. Propietario confirma → `confirmada` → arrendatario paga → `pagada` → `en_curso` (scheduler la completa al vencer) → `completada`.

### 10.4 Pagar
1. Se crea un pago en MercadoPago/Wompi (checkout_url o simulador en dev).
2. Webhook actualiza estado (`retenido`); al completar la reserva, se libera con comisión 10% (payout al propietario).
3. Movimientos contables registrados.

### 10.5 Calificar
1. Tras una reserva completada, cada parte califica (1-5) y comenta.
2. Se actualiza el promedio de la maquinaria. Se puede editar una vez / reportar.

---

## 11. Estado actual: qué funciona y qué falta

### ✅ Funcional y completo
- Registro → verificación → login (bloqueado hasta verificar) → recuperación de contraseña.
- CRUD de maquinaria, imágenes, favoritos, búsqueda con filtros y geolocalización.
- Ciclo completo de reservas y pagos (MP sandbox/simulado), scheduler de auto-completado.
- Calificaciones, notificaciones in-app + WebSocket + email.
- Panel admin básico, perfil completo con métricas.

### 🔴 Crítico (riesgos / roto)
1. **Webhook Wompi sin verificar firma** → fraude posible (marcar pagos como pagados). `WOMPI_EVENT_SECRET` existe pero no se usa (`payment-service/src/routes/index.js`).
2. **Seed demo de Docker** — corregido (antes `precio_por_hora` inexistente y UUIDs de imágenes inválidos).
3. **Tests backend rotos**: `notificationService.test.js` no compila (require path mal); auth/booking/payment/rating tienen fallos. Solo pasan gateway, machinery y search. Sin CI.
4. **Frontend de producción no se despliega**: el gateway intenta servir `/app/api-gateway/public`, pero esa carpeta no existe y ningún Dockerfile/CI compila Angular. En producción solo habría API.
5. **Sin CI/CD** para 8 servicios + frontend.

### 🟠 Funcionalidad incompleta
6. **2FA**: endpoints sin enforcement en login y sin UI.
7. **Refresh token muerto**: el frontend guarda pero nunca renueva; al expirar redirige a login.
8. **Reembolso automático** al cancelar reserva pagada: no implementado (solo admin manual).
9. **Payouts admin sin UI**: `/admin/payouts/*` sin pantalla y con proxy mal mapeado.
10. **Moderación de reseñas reportadas**: sin endpoint admin para resolverlas.
11. **Verificación de email "demo"**: atajo `POST /auth/profile/verify-email` sin token.
12. **Notificaciones**: WebSocket sin `referencia_id/tipo`; faltan emails para rating/refunds; templates `MENSAJES` sin usar.
13. **Búsqueda full-text TSVECTOR sin poblar** (solo ILIKE).
14. **Disponibilidad manual por fechas** ignorada por el motor de reservas.
15. **Reportes admin**: sin exportación CSV/PDF ni gráficos.

### 🟡 Higiene
- Claves Wompi de producción en `.env.example` versionado; credenciales SMTP/MP reales en `.env`.
- Archivo temporal `~$ntaMaq_Documentacion_Tecnica.docx` versionado.
- `docs/API.md` desactualizado (métodos, rutas admin).
- Variables `RATE_LIMIT_*` declaradas pero no usadas.
- Fallbacks de secretos hardcodeados en dev.

---

## 12. Configuración

### Variables de entorno principales (`.env`)
| Variable | Uso |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` | PostgreSQL |
| `JWT_SECRET` | Firma de tokens |
| `INTERNAL_API_KEY` | Comunicación entre microservicios |
| `RABBITMQ_URL` | Conexión a RabbitMQ |
| `MP_ACCESS_TOKEN` | MercadoPago |
| `WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_EVENT_SECRET` | Wompi |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Correos |
| `PUBLIC_URL` | URL pública del frontend (usada en enlaces de correo) |
| `NODE_ENV` | development / production (afecta rate limits, HTTPS) |
| `SSL_CERT_PATH`, `SSL_KEY_PATH` | HTTPS en producción |

### Cómo levantar
```bash
docker-compose up -d                     # producción (API + DBs + RabbitMQ)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d   # dev (frontend live)
./scripts/seed-demo.ps1                  # carga datos demo (idempotente)
```
- Gateway en `http://localhost:3100` (host), frontend dev en `http://localhost:4200`.
- Usuarios demo (password `test1234`): `admin@rentamaq.com`, propietarios `carlos@rentamaq.com`…`jorge@rentamaq.com`, arrendatarios `maria@rentamaq.com`, `andres@rentamaq.com`, `sofia@rentamaq.com`.

---

## 13. Pruebas

- **Backend**: `node --test` por servicio (`*.test.js`). Estado: gateway ✓, machinery ✓, search ✓; auth/booking/payment/rating parcial; notification no compila.
- **Frontend**: Vitest (`*.spec.ts`), 1 smoke test por componente.
- **Sin CI** que los ejecute automáticamente.

---

## 14. Preguntas para el análisis de la IA

Si quieres que la IA profundice, sugiérelas:
1. ¿Cómo diseñar un pipeline de CI/CD (build Angular + tests + deploy) para 8 servicios?
2. ¿Cómo arreglar el webhook de Wompi (validación HMAC) y el reembolso automático al cancelar?
3. ¿Cómo integrar el refresh token correctamente en el frontend?
4. ¿Cómo completar 2FA, moderación de reseñas, payouts admin y reportes con exportación?
5. ¿Cómo resolver los tests backend rotos (notification path, mocks desactualizados)?
6. Revisión de seguridad: PII pública, secretos en `.env.example`, fallbacks hardcodeados.
