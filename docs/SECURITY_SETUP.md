# 🔐 Guía de Instalación y Seguridad - Rentamaq

## 1. Instalación Rápida

### 1.1 Prerrequisitos
```bash
- Node.js >= 16
- PostgreSQL 13+
- Docker & Docker Compose (opcional)
```

### 1.2 Configuración de Entorno
```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar .env con tus valores
# IMPORTANTE: Cambiar JWT_SECRET y contraseñas
```

### 1.3 Instalar Dependencias
```bash
# API Gateway
cd api-gateway
npm install

# Auth Service
cd ../services/auth-service
npm install

# Otros servicios (repetir para cada uno)
cd ../booking-service
npm install
# ... etc
```

### 1.4 Iniciar Servicios

#### Opción A: Docker Compose (Recomendado)
```bash
# Iniciar todos los servicios
docker-compose -f docker-compose.dev.yml up

# O en modo background
docker-compose -f docker-compose.dev.yml up -d

# Ver logs
docker-compose -f docker-compose.dev.yml logs -f api-gateway
```

#### Opción B: Localmente
```bash
# Terminal 1: API Gateway
cd api-gateway
npm run dev

# Terminal 2: Auth Service
cd services/auth-service
npm run dev

# Terminal 3: Booking Service
cd services/booking-service
npm run dev

# ... repetir para otros servicios
```

## 2. Seguridad Implementada

### 2.1 Security Headers (Helmet)
✅ Content Security Policy (CSP)
✅ HSTS (HTTP Strict Transport Security)
✅ X-Frame-Options (Anti-Clickjacking)
✅ XSS Protection
✅ MIME Type Sniffing Protection

### 2.2 Rate Limiting
✅ Auth endpoints: 10 intentos / 15 minutos
✅ General endpoints: 100 requests / minuto
✅ Fallback a IP si usuario no autenticado

### 2.3 Validación de Inputs
✅ Email validation (RFC 5322)
✅ Password strength (8+ chars, mayúscula, minúscula, número)
✅ Sanitización de strings
✅ Prevención de buffer overflow

### 2.4 CORS Mejorado
✅ Orígenes configurables por entorno
✅ Métodos permitidos: GET, POST, PUT, DELETE, PATCH
✅ Headers permitidos: Content-Type, Authorization
✅ Credentials: true (para cookies JWT)

### 2.5 Logging Estructurado
✅ Winston logger con rotación de archivos
✅ Logs separados: error.log, combined.log
✅ Rotación: 5MB máximo, 5 archivos por servicio
✅ Formato JSON con timestamp, nivel, servicio, metadata

### 2.6 WebSocket Security
✅ Autenticación JWT obligatoria
✅ Usuarios separados por sala privada
✅ Manejo de errores y desconexiones

## 3. Monitoreo de Seguridad

### 3.1 Ver Logs en Tiempo Real
```bash
# API Gateway
tail -f logs/api-gateway/combined.log

# Auth Service
tail -f logs/auth-service/combined.log

# Filtrar errores
tail -f logs/api-gateway/error.log
```

### 3.2 Métricas a Monitorear
- Tasa de errores de autenticación
- Rate limit triggers
- Tiempos de respuesta
- Volumen de tráfico

### 3.3 Alertas Recomendadas
```javascript
// > 5 intentos de login fallidos en 5 minutos
// > 10 requests rechazados por rate limit
// Tiempo de respuesta > 1 segundo
// Error rate > 1%
```

## 4. Testing de Seguridad

### 4.1 Test de Rate Limiting
```bash
# Intentar login 15 veces rápidamente
for i in {1..15}; do
  curl -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"Test1234"}'
  echo "Intento $i"
done

# Esperado: A partir del intento 11, recibir 429 Too Many Requests
```

### 4.2 Test de Validación
```bash
# Email inválido
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid","password":"Test1234"}'

# Respuesta esperada: 400 Bad Request - Email inválido

# Password débil (en registro)
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@test.com",
    "password":"weak",
    "nombre":"Test",
    "apellido":"User",
    "telefono":"1234567890"
  }'

# Respuesta esperada: 400 - Password debe tener 8+ chars, mayúscula, minúscula, número
```

### 4.3 Test de CORS
```bash
# Desde origen no permitido
curl -X GET http://localhost:3000/auth/profile \
  -H "Origin: https://malicious.com" \
  -H "Authorization: Bearer your-token"

# En producción: CORS bloqueado
# En desarrollo: Permitido
```

### 4.4 Test de Security Headers
```bash
curl -i http://localhost:3000/health

# Buscar headers:
# - Strict-Transport-Security
# - X-Content-Type-Options: nosniff
# - X-Frame-Options: deny
# - X-XSS-Protection: 1; mode=block
# - Content-Security-Policy
```

## 5. Troubleshooting

### 5.1 Puerto en Uso
```bash
# Windows
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :3000

# Matar proceso
kill -9 <PID>
```

### 5.2 Conexión a Base de Datos
```bash
# Verificar conexión PostgreSQL
psql -U postgres -h localhost -d postgres

# Listar bases de datos
\l

# Ver logs
tail -f logs/auth-service/error.log
```

### 5.3 Rate Limiting No Funciona
```javascript
// Verificar que express-rate-limit esté instalado
npm list express-rate-limit

// Verificar middleware está aplicado en index.js
app.use('/auth', authLimiter);
app.use('/', userLimiter);
```

## 6. Próximos Pasos

### 6.1 Muy Importante (ASAP)
- [ ] Cambiar JWT_SECRET en .env
- [ ] Configurar ALLOWED_ORIGINS para producción
- [ ] Implementar HTTPS/TLS
- [ ] Encriptación de contraseñas (bcrypt)

### 6.2 Corto Plazo (Próximas 2 semanas)
- [ ] Secrets Manager (AWS Secrets / HashiCorp Vault)
- [ ] 2FA (Autenticación de dos factores)
- [ ] Audit logs completos
- [ ] Pen testing básico

### 6.3 Mediano Plazo (Próximo mes)
- [ ] OWASP Top 10 audit completo
- [ ] Encriptación de datos en reposo
- [ ] Backup y disaster recovery
- [ ] Monitoring y alertas centralizadas

## 7. Recursos y Referencias

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Winston Logger](https://github.com/winstonjs/winston)
- [Helmet.js](https://helmetjs.github.io/)
- [Express Rate Limit](https://github.com/nfriedly/express-rate-limit)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

**Última actualización**: 2024
**Versión**: 1.0.0
**Criticidad**: ALTA
