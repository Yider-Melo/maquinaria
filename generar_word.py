from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
import os

doc = Document()

# ============================================================
# ESTILOS
# ============================================================
style = doc.styles['Normal']
font = style.font
font.name = 'Calibri'
font.size = Pt(11)

for level in range(1, 4):
    h = doc.styles[f'Heading {level}']
    h.font.color.rgb = RGBColor(0x1A, 0x56, 0xDB)

# ============================================================
# PORTADA
# ============================================================
for _ in range(6):
    doc.add_paragraph()

title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = title.add_run('RENTAMAQ')
run.bold = True
run.font.size = Pt(36)
run.font.color.rgb = RGBColor(0x1A, 0x56, 0xDB)

subtitle = doc.add_paragraph()
subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = subtitle.add_run('Plataforma de Alquiler de Maquinaria Pesada\nDocumentación Técnica y Análisis de Código')
run.font.size = Pt(16)
run.font.color.rgb = RGBColor(0x55, 0x55, 0x55)

doc.add_page_break()

# ============================================================
# TABLA DE CONTENIDO
# ============================================================
doc.add_heading('Índice', level=1)
toc_items = [
    '1. Resumen del Proyecto',
    '2. Stack Tecnológico',
    '3. Arquitectura del Sistema',
    '4. Microservicios',
    '5. Buenas Prácticas — Node.js / Express',
    '6. Buenas Prácticas — Angular',
    '7. Anti-patrones y Áreas de Mejora',
]
for item in toc_items:
    doc.add_paragraph(item, style='List Number')

doc.add_page_break()

# ============================================================
# 1. RESUMEN DEL PROYECTO
# ============================================================
doc.add_heading('1. Resumen del Proyecto', level=1)
doc.add_paragraph(
    'RentaMaq es una plataforma web completa para la gestión y alquiler de maquinaria pesada '
    '(retroexcavadoras, bulldozers, grúas, etc.), construida con una arquitectura de microservicios. '
    'El sistema permite a propietarios publicar su maquinaria, a arrendatarios buscar y reservar '
    'equipos, y gestionar todo el ciclo de vida del alquiler: desde la solicitud hasta el pago y la calificación.'
)

doc.add_heading('1.1 Funcionalidades Principales', level=2)
features = [
    'Registro de usuarios con roles: propietario, arrendatario y administrador',
    'Autenticación JWT con soporte para 2FA (TOTP)',
    'Publicación y gestión de maquinaria con múltiples imágenes',
    'Calendario de disponibilidad por fecha',
    'Búsqueda full-text con filtros por tipo, precio, ubicación geográfica',
    'Mapa interactivo con Leaflet / OpenStreetMap',
    'Sistema de reservas con ciclo completo (solicitud → confirmación → pago → finalización)',
    'Integración de pagos con MercadoPago (retención, liberación, reembolsos)',
    'Calificaciones y reseñas post-alquiler (1-5 estrellas)',
    'Notificaciones en tiempo real vía WebSocket (Socket.IO)',
    'Panel de administración con estadísticas, contabilidad y reportes',
]
for f in features:
    doc.add_paragraph(f, style='List Bullet')

doc.add_page_break()

# ============================================================
# 2. STACK TECNOLÓGICO
# ============================================================
doc.add_heading('2. Stack Tecnológico', level=1)

table = doc.add_table(rows=9, cols=2)
table.style = 'Light Grid Accent 1'
table.alignment = WD_TABLE_ALIGNMENT.CENTER

data = [
    ('Runtime', 'Node.js 20 (Alpine Linux)'),
    ('Backend Framework', 'Express.js 4.18'),
    ('Frontend', 'Angular 21.2, Angular Material, Leaflet'),
    ('Base de Datos', 'PostgreSQL 15 (una por microservicio)'),
    ('Mensajería', 'RabbitMQ (topic exchange)'),
    ('API Gateway', 'Express + http-proxy-middleware + Socket.IO'),
    ('Autenticación', 'JWT, bcrypt, speakeasy (2FA TOTP)'),
    ('Pagos', 'MercadoPago (webhooks)'),
    ('Contenedores', 'Docker, Docker Compose'),
]
for i, (k, v) in enumerate(data):
    table.rows[i].cells[0].text = k
    table.rows[i].cells[1].text = v

doc.add_paragraph()
doc.add_heading('2.1 Dependencias Compartidas', level=2)
doc.add_paragraph(
    'El proyecto cuenta con una librería compartida (shared/) que es un paquete npm local consumido por todos los microservicios. '
    'Proporciona: clases de error personalizadas (AppError, NotFoundError, ValidationError, etc.), '
    'middleware de autenticación JWT, helpers de respuesta (success, paginated), '
    'middleware de validación con Joi, schemas de validación, y un cliente de RabbitMQ para el bus de eventos.'
)

doc.add_page_break()

# ============================================================
# 3. ARQUITECTURA
# ============================================================
doc.add_heading('3. Arquitectura del Sistema', level=1)
doc.add_paragraph(
    'El sistema sigue un patrón de microservicios con API Gateway como punto de entrada único. '
    'Cada microservicio tiene su propia base de datos PostgreSQL, garantizando independencia y aislamiento. '
    'La comunicación asíncrona entre servicios se realiza mediante RabbitMQ (topic exchange rentamaq.events).'
)

doc.add_heading('3.1 Flujo de Comunicación', level=2)
flow = [
    'El frontend Angular se comunica exclusivamente con el API Gateway (puerto 3000)',
    'El Gateway valida JWT, aplica rate limiting y redirige las peticiones al microservicio correspondiente',
    'Los microservicios publican eventos en RabbitMQ cuando ocurren acciones relevantes',
    'Otros servicios se suscriben a eventos para mantener sus datos sincronizados',
    'El servicio de notificaciones empuja eventos en tiempo real al Gateway vía HTTP interno',
    'El Gateway reenvía las notificaciones al frontend mediante Socket.IO',
]
for f in flow:
    doc.add_paragraph(f, style='List Bullet')

doc.add_heading('3.2 Flujo de Eventos', level=2)
events = [
    'machinery-service publica machinery.* (created/updated/deleted) → search-service lo consume para indexar',
    'booking-service publica booking.* (created/confirmed/cancelled/completed) → notification-service lo consume',
    'Las notificaciones se entregan en tiempo real vía Socket.IO al usuario correspondiente',
]
for e in events:
    doc.add_paragraph(e, style='List Bullet')

doc.add_page_break()

# ============================================================
# 4. MICROSERVICIOS
# ============================================================
doc.add_heading('4. Microservicios', level=1)

services = [
    ('API Gateway (3000)', 'Proxy inverso, validación JWT, rate limiting, WebSocket (Socket.IO)'),
    ('Auth Service (3001)', 'Registro, login, 2FA, recuperación de contraseña, perfil, CRUD de usuarios (admin)'),
    ('Machinery Service (3002)', 'CRUD de maquinaria, gestión de imágenes, disponibilidad por fecha, eventos a RabbitMQ'),
    ('Search Service (3003)', 'Búsqueda full-text, filtros por tipo/precio/ubicación, autocompletado, geolocalización'),
    ('Booking Service (3004)', 'Ciclo de vida de reservas (pendiente → confirmada → en_curso → completada), validación de disponibilidad'),
    ('Payment Service (3005)', 'Integración con MercadoPago, webhooks, retención/liberación/reembolso, dashboard financiero'),
    ('Rating Service (3006)', 'Calificaciones 1-5 por reserva, promedio por usuario, reporte de reseñas'),
    ('Notification Service (3007)', 'Notificaciones en tiempo real, suscripción a eventos de booking, push vía Socket.IO'),
]

for name, desc in services:
    doc.add_heading(name, level=2)
    doc.add_paragraph(desc)

doc.add_page_break()

# ============================================================
# 5. BUENAS PRÁCTICAS NODE
# ============================================================
doc.add_heading('5. Buenas Prácticas — Node.js / Express', level=1)

practices_node = [
    ('Jerarquía de errores personalizada',
     'Se implementó una clase base AppError con flag isOperational y subclases semánticas '
     '(NotFoundError, ValidationError, UnauthorizedError, ForbiddenError, ConflictError). '
     'Esto permite distinguir errores esperados vs inesperados en el middleware global de errores.',
     'shared/errors/AppError.js'),
    ('Middleware de errores global',
     'Un único middleware Express captura todos los errores. Si es AppError, devuelve el código y mensaje '
     'correspondiente. Si es inesperado, responde con 500 y loguea el error.',
     'shared/errors/errorHandler.js'),
    ('Event Bus con RabbitMQ',
     'Uso de exchange tipo topic para enrutamiento flexible con wildcards. Mensajes persistentes '
     '(persistent: true) para supervivencia ante reinicios. Cada mensaje incluye eventId y timestamp '
     'para procesamiento idempotente. Manejo correcto de ack/nack.',
     'shared/events/eventBus.js'),
    ('Validación con Joi',
     'Schemas centralizados y reutilizables para cada entidad. stripUnknown: true previene mass assignment. '
     'Middleware validate(schema) factory pattern que se aplica por ruta.',
     'shared/validators/schemas.js, shared/utils/validate.js'),
    ('Auth middleware curry',
     'La función requireRole(...roles) retorna un middleware currificado, permitiendo uso declarativo '
     'como requireRole("admin", "propietario") en las rutas.',
     'shared/middleware/authMiddleware.js'),
    ('Respuestas estandarizadas',
     'Helpers success() y paginated() aseguran que todas las respuestas sigan el formato '
     '{ success: true, data: ... } con metadatos de paginación consistentes.',
     'shared/utils/response.js'),
    ('Rate limiting por ruta',
     'Límites diferenciados: 10 requests cada 15 minutos para auth, 100/min para el resto. '
     'Key generator usa userId si está autenticado, IP si es anónimo.',
     'api-gateway/src/middleware/rateLimiter.js'),
    ('Consultas parametrizadas',
     'Todas las consultas SQL usan parámetros ($1, $2, ...) en lugar de concatenación de strings, '
     'previniendo completamente SQL injection.',
     'Todos los controladores'),
    ('bcrypt con costo 12',
     'El hash de contraseñas usa bcrypt con salt rounds = 12, y los tokens JWT incluyen solo campos '
     'esenciales (id, email, tipo_usuario, nombre), no el objeto completo.',
     'services/auth-service/src/controllers/authController.js'),
    ('Prevención de email enumeration',
     'El endpoint forgot-password siempre retorna { success: true } independientemente de si el email '
     'existe o no, evitando que un atacante pueda descubrir emails registrados.',
     'services/auth-service/src/controllers/authController.js:174'),
]

for title, desc, location in practices_node:
    doc.add_heading(title, level=2)
    doc.add_paragraph(desc)
    p = doc.add_paragraph()
    run = p.add_run(f'📁 {location}')
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(0x88, 0x88, 0x88)

doc.add_page_break()

# ============================================================
# 6. BUENAS PRÁCTICAS ANGULAR
# ============================================================
doc.add_heading('6. Buenas Prácticas — Angular', level=1)

practices_angular = [
    ('TypeScript Strict Mode',
     'tsconfig.json configurado con strict: true, strictTemplates: true, noImplicitOverride: true, '
     'noPropertyAccessFromIndexSignature: true, noImplicitReturns: true, noFallthroughCasesInSwitch: true. '
     'Esto garantiza el máximo nivel de seguridad de tipos.',
     'frontend/tsconfig.json'),
    ('Lazy Loading en todos los módulos',
     'Cada feature module (auth, machinery, bookings, payments, ratings, notifications, admin) '
     'se carga mediante lazy loading con loadChildren, minimizando el bundle inicial.',
     'frontend/src/app/app-routing-module.ts'),
    ('Interceptor funcional moderno',
     'Uso de HttpInterceptorFn (functional interceptor) con withInterceptors() en lugar del '
     'clásico HttpInterceptor basado en clases. Es más tree-shakeable y moderno.',
     'frontend/src/app/core/interceptors/auth-interceptor.ts'),
    ('SharedModule para Material',
     'Todos los módulos de Angular Material se importan y re-exportan desde un SharedModule, '
     'evitando importaciones repetidas en cada feature module.',
     'frontend/src/app/shared/shared-module.ts'),
    ('Guards anidados en rutas admin',
     'Las rutas de administración usan AuthGuard + RoleGuard con roles especificados en route.data, '
     'siguiendo el principio de defensa en profundidad.',
     'frontend/src/app/admin/admin-routing-module.ts:13'),
    ('ApiService genérico tipado',
     'El servicio base ApiService usa genéricos (<T>) en todos sus métodos (get<T>, post<T>, etc.), '
     'permitiendo que los componentes especifiquen el tipo esperado de respuesta.',
     'frontend/src/app/core/services/api.ts'),
    ('Socket.IO envuelto en Observables',
     'Los eventos de Socket.IO se exponen como Observables de RxJS, integrándose de forma natural '
     'con el ecosistema reactivo de Angular.',
     'frontend/src/app/core/services/socket.ts'),
    ('GlobalErrorHandler para 401',
     'Manejador global de errores que captura respuestas 401, limpia credenciales y redirige al login, '
     'evitando duplicar esta lógica en cada componente.',
     'frontend/src/app/app-module.ts:18'),
    ('Uso de forkJoin con catchError',
     'Para llamadas paralelas, se usa forkJoin combinado con catchError para evitar que el fallo de '
     'una llamada bloquee las demás.',
     'frontend/src/app/payments/list/list.ts:24'),
    ('MatDialog para confirmaciones',
     'Las acciones destructivas (eliminar maquinaria, cancelar reserva) usan MatDialog para requerir '
     'confirmación del usuario, siguiendo las guías de UX de Material Design.',
     'frontend/src/app/bookings/list/list.ts, frontend/src/app/machinery/detail/detail.ts'),
]

for title, desc, location in practices_angular:
    doc.add_heading(title, level=2)
    doc.add_paragraph(desc)
    p = doc.add_paragraph()
    run = p.add_run(f'📁 {location}')
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(0x88, 0x88, 0x88)

doc.add_page_break()

# ============================================================
# 7. ANTI-PATRONES Y MEJORAS
# ============================================================
doc.add_heading('7. Anti-patrones y Áreas de Mejora', level=1)

doc.add_heading('7.1 Backend — Node.js / Express', level=2)

anti_node = [
    ('CRÍTICO: JWT_SECRET hardcodeado',
     'El secreto JWT "rentamaq-secret-key-dev" está hardcodeado en shared/middleware/authMiddleware.js, '
     'api-gateway/src/middleware/authMiddleware.js y authController.js. Cualquier persona con acceso al '
     'código puede forjar tokens válidos.',
     'shared/middleware/authMiddleware.js:7, gateway/middleware/authMiddleware.js:6, authController.js:12'),
    ('CRÍTICO: Password de BD hardcodeada',
     'La contraseña de PostgreSQL está hardcodeada como "0000" en todos los archivos db.js y en el .env.',
     'Todos los services/*/src/db.js'),
    ('CRÍTICO: Endpoint interno sin autenticación',
     'El endpoint /_ws/notify del API Gateway no tiene autenticación. Cualquier servicio o atacante '
     'que alcance el gateway puede enviar notificaciones a cualquier usuario.',
     'api-gateway/src/index.js:33'),
    ('CRÍTICO: Token de verificación expuesto',
     'El token de verificación de email se devuelve en la respuesta del registro. Un atacante que '
     'intercepte la respuesta puede verificar el email inmediatamente.',
     'authController.js:38'),
    ('CRÍTICO: CORS permisivo',
     'El API Gateway usa origin: "*" para CORS, permitiendo peticiones desde cualquier dominio.',
     'api-gateway/src/index.js:15,20'),
    ('CRÍTICO: Eventos sin await',
     'eventBus.publishEvent() se llama sin await en machineryController, los errores de publicación '
     'se tragan silenciosamente.',
     'machineryController.js:22,93,106'),
    ('ALTO: Llamada síncrona entre servicios',
     'booking-service llama a machinery-service vía HTTP sincrónico dentro de una transacción. '
     'Si machinery-service falla, la reserva falla. Debería ser asíncrono vía eventos.',
     'bookingController.js:46'),
    ('ALTO: Middleware duplicado',
     'El gateway tiene su propia copia del middleware de autenticación en vez de importar desde shared/.',
     'gateway/middleware/authMiddleware.js'),
    ('ALTO: pathRewrite inconsistente',
     'Las rutas admin en el gateway (/admin/users, /admin/bookings, /admin/machinery) tienen reglas '
     'de reescritura de path inconsistentes que causarán errores en runtime.',
     'gateway/routes/index.js:55-79'),
    ('MEDIO: Cálculo ingenuo de días',
     'El cálculo de días entre fechas en booking-service no considera cambios de horario de verano, '
     'husos horarios ni segundos intercalares. Debería usar date-fns o dayjs.',
     'bookingController.js:58'),
    ('MEDIO: Validación Joi faltante en endpoints',
     'Múltiples endpoints carecen de validación Joi: /validate-token, /forgot-password, /reset-password, '
     'POST booking, PUT machinery, etc.',
     'Varios routes/index.js'),
    ('MEDIO: Sin logger estructurado',
     'Todos los servicios usan console.log/console.error. Deberían usar Winston, Pino o similar.',
     'Todos los servicios'),
    ('MEDIO: Sin graceful shutdown',
     'Ningún servicio maneja SIGTERM/SIGINT para cerrar conexiones de BD y RabbitMQ gracefulmente.',
     'Todos los services/*/src/index.js'),
]

for title, desc, location in anti_node:
    doc.add_heading(title, level=3)
    doc.add_paragraph(desc)
    p = doc.add_paragraph()
    run = p.add_run(f'📁 {location}')
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(0x88, 0x88, 0x88)

doc.add_heading('7.2 Frontend — Angular', level=2)

anti_angular = [
    ('CRÍTICO: Uso de .toPromise()',
     'Los dashboards (usuario y admin) usan .toPromise() que está deprecado en RxJS 7. '
     'Deberían usar forkJoin o combineLatest.',
     'dashboard/dashboard.ts, admin/dashboard/dashboard.ts, admin/performance/, admin/reports/'),
    ('CRÍTICO: Sin takeUntil en subscriptions',
     'Ningún componente usa takeUntil(this.destroy$) para limpiar subscriptions. '
     'Cada subscribe() es un potencial memory leak.',
     'Todos los componentes con subscribe()'),
    ('CRÍTICO: Widespread any types',
     'Casi todos los componentes usan any (items: any[], stats: any, booking: any). '
     'No hay interfaces de dominio para Machinery, Booking, Payment, etc.',
     'Casi todos los componentes'),
    ('CRÍTICO: Socket listeners sin cleanup',
     'Los métodos onNotification() y onNewBooking() no ejecutan socket.off() al hacer unsubscribe, '
     'causando acumulación de listeners.',
     'core/services/socket.ts:30-43'),
    ('ALTO: Sin finalize() para loading states',
     'No se usa el operador finalize() de RxJS para resetear loading, causando que la UI se quede '
     'en estado "cargando" si la llamada falla.',
     'login.ts, register.ts, machinery/list.ts, machinery/form.ts'),
    ('ALTO: Template-driven forms en vez de ReactiveForms',
     'Todos los formularios usan [(ngModel)] en vez de FormBuilder/FormGroup, perdiendo validación '
     'programática, tipado y facilidad de testing.',
     'auth/login.ts, auth/register.ts, machinery/form.ts'),
    ('ALTO: Error swallowing silencioso',
     'Múltiples catch(() => {}) y catch(() => this.loading = false) descartan errores sin feedback.',
     'dashboard/dashboard.ts, admin/reports/reports.ts'),
    ('ALTO: N+1 query en payments',
     'Se hace 1 petición HTTP por cada booking para obtener su pago. Con 100 bookings, 100 requests.',
     'payments/list/list.ts:22-28'),
    ('MEDIO: ngOnInit() llamado manualmente',
     'En bookings y ratings se llama this.ngOnInit() para refrescar datos tras una acción, '
     'en vez de un método load() separado.',
     'bookings/list/list.ts, ratings/list/list.ts'),
    ('MEDIO: Leaflet map sin ngOnDestroy cleanup',
     'El componente de mapa Leaflet no destruye el mapa al salir del componente.',
     'machinery/map/map.ts'),
    ('MEDIO: Sin ChangeDetectionStrategy.OnPush',
     'Ningún componente usa OnPush, todos usan el strategy por defecto (menos performante).',
     'Todos los componentes'),
    ('MEDIO: Sin path aliases en tsconfig',
     'No hay path mapping (@core/, @shared/). Todas las importaciones usan rutas relativas profundas.',
     'tsconfig.json'),
    ('BAJO: Token en localStorage (XSS)',
     'El JWT se almacena en localStorage. Para producción, deberían usarse HttpOnly cookies.',
     'auth.ts, auth-interceptor.ts'),
    ('BAJO: Sin refresh token mechanism',
     'No hay renovación silenciosa del token. Cuando expira, el usuario es redirigido al login.',
     'auth.ts'),
    ('BAJO: Sin preloading strategy',
     'Los módulos lazy se cargan solo a demanda. PreloadAllModules mejoraría la experiencia.',
     'app-routing-module.ts'),
]

for title, desc, location in anti_angular:
    doc.add_heading(title, level=3)
    doc.add_paragraph(desc)
    p = doc.add_paragraph()
    run = p.add_run(f'📁 {location}')
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(0x88, 0x88, 0x88)

doc.add_page_break()

# ============================================================
# TABLA RESUMEN PRIORIDADES
# ============================================================
doc.add_heading('8. Prioridades de Mejora — Resumen', level=1)

table2 = doc.add_table(rows=1, cols=3)
table2.style = 'Light Grid Accent 1'
hdr = table2.rows[0].cells
hdr[0].text = 'Prioridad'
hdr[1].text = 'Backend'
hdr[2].text = 'Frontend'

priorities = [
    ('Inmediata', 'Secrets hardcodeados, endpoint sin auth, eventos sin await', '.toPromise(), memory leaks (subs + socket)'),
    ('Alta', 'Llamadas síncronas entre servicios, validación faltante, middleware duplicado', 'Tipado any, loading states, reactive forms'),
    ('Media', 'Logger, graceful shutdown, circuit breaker, cálculo fechas', 'OnPush, N+1 queries, leaflet cleanup'),
    ('Baja', 'Reconnection RabbitMQ, forgot-password incompleto', 'Path aliases, refresh token, preloading'),
]

for p, b, f in priorities:
    row = table2.add_row().cells
    row[0].text = p
    row[1].text = b
    row[2].text = f

# ============================================================
# GUARDAR
# ============================================================
output_path = os.path.join(os.path.dirname(__file__), 'RentaMaq_Documentacion_Tecnica.docx')
doc.save(output_path)
print(f'Documento generado: {output_path}')
