# 🔒 Seguridad de la Plataforma Rentamaq

## 1. Implementación de Seguridad

### 1.1 Security Headers (Helmet)
- **Content Security Policy (CSP)**: Restricción de orígenes de contenido
- **HSTS**: HTTP Strict Transport Security - obliga conexiones HTTPS
- **X-Frame-Options**: Previene clickjacking (`deny`)
- **X-Content-Type-Options**: Previene MIME type sniffing
- **X-XSS-Protection**: Protección contra XSS
- **Referrer Policy**: Control de información de referer

### 1.2 CORS Mejorado
```javascript
// Desarrollo: permite localhost
// Producción: solo orígenes configurados en ALLOWED_ORIGINS
// Métodos permitidos: GET, POST, PUT, DELETE, PATCH
// Headers permitidos: Content-Type, Authorization
```

**Configuración requerida en producción:**
```bash
ALLOWED_ORIGINS=https://app.rentamaq.com,https://admin.rentamaq.com
```

### 1.3 Validación de Inputs
**Middleware de validación en auth-service:**

#### Login/Register Validation:
- **Email**: Validación RFC 5322 simple
- **Password**: Mínimo 8 caracteres, mayúscula, minúscula, número
- **Sanitización**: Eliminación de caracteres especiales (<, >, ", ')
- **Límite de longitud**: Prevención de buffer overflow

#### Validaciones Específicas:
- Trimming de espacios
- Validación de formato de email
- Validación de fortaleza de contraseña
- Máximo 1000 caracteres para strings

### 1.4 Rate Limiting
```javascript
// Auth endpoints: 10 intentos por 15 minutos
// General endpoints: 100 requests por minuto por usuario/IP
// Fallback a IP si usuario no autenticado
```

**Limites aplicados:**
- POST `/auth/login`: 10/15min
- POST `/auth/register`: 10/15min
- General `/`: 100/60sec

## 2. Logging Estructurado (Winston)

### 2.1 Niveles de Log
- **ERROR**: Errores críticos
- **WARN**: Advertencias de seguridad (intentos fallidos, CORS bloqueado)
- **INFO**: Eventos importantes (login, registro, conexiones)
- **DEBUG**: Información de debug detallada

### 2.2 Archivos de Log
```
logs/
├── api-gateway/
│   ├── combined.log (todos los niveles)
│   └── error.log (solo errores)
├── auth-service/
│   ├── combined.log
│   └── error.log
├── booking-service/
├── machinery-service/
└── ... (otros servicios)
```

### 2.3 Rotación de Logs
- **Tamaño máximo**: 5MB por archivo
- **Retención**: 5 archivos por servicio
- **Formato**: JSON con timestamp, nivel, servicio, mensaje, metadatos

### 2.4 Información de Log
Cada log incluye:
- `timestamp`: Fecha y hora (YYYY-MM-DD HH:mm:ss)
- `level`: Nivel de severidad
- `service`: Nombre del servicio
- `message`: Mensaje principal
- `metadata`: Información contextual (userId, IP, error, etc.)

## 3. HTTP Logging

### 3.1 Request Logging
```json
{
  "method": "POST",
  "url": "/auth/login",
  "ip": "192.168.1.100",
  "userId": null,
  "userAgent": "Mozilla/5.0..."
}
```

### 3.2 Response Logging
```json
{
  "method": "POST",
  "url": "/auth/login",
  "statusCode": 200,
  "duration": "125ms",
  "userId": 5
}
```

### 3.3 Error Logging
- Errores de autorización (401, 403)
- Errores de validación (400)
- Errores internos (500)
- Stack trace completo en logs de error

## 4. WebSocket Security

### 4.1 Autenticación JWT
- Token requerido en handshake
- Verificación de JWT antes de permitir conexión
- Usuario separado por sala privada: `user:{userId}`

### 4.2 Validación de Mensajes
- Solo usuarios autenticados pueden conectar
- Disconnect automático si token inválido

## 5. Variables de Entorno Requeridas

```bash
# Seguridad
JWT_SECRET=your-secure-secret-key
NODE_ENV=production

# CORS
ALLOWED_ORIGINS=https://app.rentamaq.com,https://api.rentamaq.com

# Logging
LOG_LEVEL=info
```

## 6. Checklist de Seguridad

- [x] Security headers implementados (Helmet)
- [x] CORS configurado y restringido
- [x] Rate limiting activo
- [x] Validación de inputs
- [x] Logging estructurado
- [x] Autenticación WebSocket
- [x] Manejo de errores global
- [ ] Secrets manager (próximo: AWS Secrets Manager / HashiCorp Vault)
- [ ] Encriptación de datos en tránsito (HTTPS/TLS)
- [ ] Encriptación de datos en reposo (base de datos)
- [ ] OWASP Top 10 audit

## 7. Monitoreo

### 7.1 Métricas a Monitorear
- Tasa de errores de autenticación
- Rate limit triggers
- Tiempos de respuesta
- Volumen de tráfico
- Errores no capturados

### 7.2 Alertas Recomendadas
- > 5 intentos de login fallidos en 5 minutos
- > 10 requests rechazados por rate limit
- Tiempo de respuesta > 1 segundo
- Error rate > 1%

## 8. Próximos Pasos

1. **Secrets Manager**: Implementar AWS Secrets Manager o HashiCorp Vault
2. **HTTPS/TLS**: Certificados SSL en producción
3. **Database Encryption**: Encriptación de contraseñas (bcrypt) y datos sensibles
4. **OWASP Top 10**: Audit completo de vulnerabilidades
5. **Pen Testing**: Pruebas de penetración profesionales
6. **2FA**: Autenticación de dos factores
7. **Audit Logs**: Registro detallado de acciones administrativas
8. **API Key Management**: Para acceso a APIs internas

---

**Última actualización**: 2024
**Responsable**: Equipo de Seguridad
**Criticidad**: ALTA
