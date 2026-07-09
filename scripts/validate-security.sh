#!/bin/bash
# ============================================
# Security Validation Script para Rentamaq
# Verifica que todas las medidas de seguridad estén en su lugar
# ============================================

echo "🔍 Iniciando validación de seguridad..."
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

# ============================================
# 1. Verificar Archivos de Seguridad
# ============================================
echo "📋 Verificando archivos de seguridad..."

check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} Existe: $1"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Falta: $1"
    ((FAILED++))
  fi
}

check_file "api-gateway/src/config/logger.js"
check_file "api-gateway/src/config/security.js"
check_file "api-gateway/src/middleware/httpLogger.js"
check_file "services/auth-service/src/middleware/validation.js"
check_file "shared/logger.js"
check_file "docs/SECURITY.md"
check_file "docs/SECURITY_SETUP.md"

echo ""

# ============================================
# 2. Verificar package.json Dependencies
# ============================================
echo "📦 Verificando dependencias en package.json..."

check_dependency() {
  if grep -q "\"$1\"" "$2"; then
    echo -e "${GREEN}✓${NC} $1 en $2"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Falta $1 en $2"
    ((FAILED++))
  fi
}

check_dependency "helmet" "api-gateway/package.json"
check_dependency "winston" "api-gateway/package.json"
check_dependency "express-rate-limit" "api-gateway/package.json"

echo ""

# ============================================
# 3. Verificar .env Configuration
# ============================================
echo "⚙️  Verificando configuración .env..."

if [ -f ".env" ]; then
  echo -e "${GREEN}✓${NC} .env existe"
  ((PASSED++))
  
  # Verificar que JWT_SECRET no sea el default
  if grep -q "JWT_SECRET=change-this" .env; then
    echo -e "${RED}✗${NC} ⚠️  JWT_SECRET no ha sido cambiado!"
    ((FAILED++))
  else
    echo -e "${GREEN}✓${NC} JWT_SECRET configurado (no es el valor por defecto)"
    ((PASSED++))
  fi
  
  if grep -q "NODE_ENV=" .env; then
    echo -e "${GREEN}✓${NC} NODE_ENV configurado"
    ((PASSED++))
  fi
else
  echo -e "${YELLOW}⚠${NC} .env no existe (crear con: cp .env.example .env)"
  ((FAILED++))
fi

echo ""

# ============================================
# 4. Verificar Middleware en API Gateway
# ============================================
echo "🔒 Verificando middleware de seguridad en API Gateway..."

check_code() {
  if grep -q "$2" "$1" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} $3"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} $3"
    ((FAILED++))
  fi
}

check_code "api-gateway/src/index.js" "securityHeaders" "Security headers (Helmet)"
check_code "api-gateway/src/index.js" "httpLogger" "HTTP Logger middleware"
check_code "api-gateway/src/index.js" "authLimiter" "Auth rate limiter"
check_code "api-gateway/src/index.js" "userLimiter" "User rate limiter"
check_code "api-gateway/src/index.js" "logger.info" "Winston logging"

echo ""

# ============================================
# 5. Verificar Auth Service
# ============================================
echo "🔐 Verificando validación en Auth Service..."

check_code "services/auth-service/src/middleware/validation.js" "validateEmail" "Email validation"
check_code "services/auth-service/src/middleware/validation.js" "validatePassword" "Password validation"
check_code "services/auth-service/src/middleware/validation.js" "sanitize" "Input sanitization"

echo ""

# ============================================
# 6. Verificar Ports Configurados
# ============================================
echo "🔌 Verificando configuración de puertos..."

check_code "api-gateway/src/index.js" "3000" "API Gateway puerto 3000"
check_code "services/auth-service/src/index.js" "3001" "Auth Service puerto 3001"

echo ""

# ============================================
# 7. Resultados
# ============================================
echo "════════════════════════════════════════"
echo "📊 RESULTADOS DE VALIDACIÓN"
echo "════════════════════════════════════════"
echo -e "${GREEN}✓ Pasados: $PASSED${NC}"
echo -e "${RED}✗ Fallidos: $FAILED${NC}"
echo "════════════════════════════════════════"

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ ¡TODAS LAS VERIFICACIONES PASARON!${NC}"
  echo ""
  echo "Próximos pasos:"
  echo "1. npm install en api-gateway"
  echo "2. npm install en cada servicio"
  echo "3. docker-compose up"
  echo "4. Acceder a: http://localhost:3000/health"
  exit 0
else
  echo -e "${RED}❌ EXISTEN PROBLEMAS A RESOLVER${NC}"
  echo ""
  echo "Correcciones necesarias:"
  echo "1. Crear archivos faltantes"
  echo "2. Actualizar package.json con dependencias"
  echo "3. Copiar .env.example a .env"
  echo "4. Ejecutar: npm install"
  exit 1
fi
