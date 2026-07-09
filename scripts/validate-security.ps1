# ============================================
# Security Validation Script para Rentamaq (PowerShell)
# Verifica que todas las medidas de seguridad estén en su lugar
# ============================================

Write-Host "🔍 Iniciando validación de seguridad..." -ForegroundColor Cyan
Write-Host ""

$PASSED = 0
$FAILED = 0

# ============================================
# 1. Verificar Archivos de Seguridad
# ============================================
Write-Host "📋 Verificando archivos de seguridad..." -ForegroundColor Yellow

function Check-File {
  param([string]$Path, [string]$Name)
  if (Test-Path $Path) {
    Write-Host "✓ Existe: $Name" -ForegroundColor Green
    $script:PASSED++
  } else {
    Write-Host "✗ Falta: $Name" -ForegroundColor Red
    $script:FAILED++
  }
}

Check-File "api-gateway/src/config/logger.js" "api-gateway/src/config/logger.js"
Check-File "api-gateway/src/config/security.js" "api-gateway/src/config/security.js"
Check-File "api-gateway/src/middleware/httpLogger.js" "api-gateway/src/middleware/httpLogger.js"
Check-File "services/auth-service/src/middleware/validation.js" "services/auth-service/src/middleware/validation.js"
Check-File "shared/logger.js" "shared/logger.js"
Check-File "docs/SECURITY.md" "docs/SECURITY.md"
Check-File "docs/SECURITY_SETUP.md" "docs/SECURITY_SETUP.md"

Write-Host ""

# ============================================
# 2. Verificar package.json Dependencies
# ============================================
Write-Host "📦 Verificando dependencias en package.json..." -ForegroundColor Yellow

function Check-Dependency {
  param([string]$Package, [string]$FilePath)
  $content = Get-Content $FilePath -ErrorAction SilentlyContinue
  if ($content -like "*`"$Package`"*") {
    Write-Host "✓ $Package en $FilePath" -ForegroundColor Green
    $script:PASSED++
  } else {
    Write-Host "✗ Falta $Package en $FilePath" -ForegroundColor Red
    $script:FAILED++
  }
}

Check-Dependency "helmet" "api-gateway/package.json"
Check-Dependency "winston" "api-gateway/package.json"
Check-Dependency "express-rate-limit" "api-gateway/package.json"

Write-Host ""

# ============================================
# 3. Verificar .env Configuration
# ============================================
Write-Host "⚙️  Verificando configuración .env..." -ForegroundColor Yellow

if (Test-Path ".env") {
  Write-Host "✓ .env existe" -ForegroundColor Green
  $script:PASSED++
  
  $envContent = Get-Content ".env"
  
  if ($envContent -like "*JWT_SECRET=change-this*") {
    Write-Host "✗ ⚠️  JWT_SECRET no ha sido cambiado!" -ForegroundColor Red
    $script:FAILED++
  } else {
    Write-Host "✓ JWT_SECRET configurado (no es el valor por defecto)" -ForegroundColor Green
    $script:PASSED++
  }
  
  if ($envContent -like "*NODE_ENV=*") {
    Write-Host "✓ NODE_ENV configurado" -ForegroundColor Green
    $script:PASSED++
  }
} else {
  Write-Host "⚠  .env no existe (crear con: Copy-Item .env.example .env)" -ForegroundColor Yellow
  $script:FAILED++
}

Write-Host ""

# ============================================
# 4. Verificar Middleware en API Gateway
# ============================================
Write-Host "🔒 Verificando middleware de seguridad en API Gateway..." -ForegroundColor Yellow

function Check-Code {
  param([string]$FilePath, [string]$SearchText, [string]$Description)
  $content = Get-Content $FilePath -ErrorAction SilentlyContinue
  if ($content -like "*$SearchText*") {
    Write-Host "✓ $Description" -ForegroundColor Green
    $script:PASSED++
  } else {
    Write-Host "✗ $Description" -ForegroundColor Red
    $script:FAILED++
  }
}

Check-Code "api-gateway/src/index.js" "securityHeaders" "Security headers (Helmet)"
Check-Code "api-gateway/src/index.js" "httpLogger" "HTTP Logger middleware"
Check-Code "api-gateway/src/index.js" "authLimiter" "Auth rate limiter"
Check-Code "api-gateway/src/index.js" "userLimiter" "User rate limiter"
Check-Code "api-gateway/src/index.js" "logger.info" "Winston logging"

Write-Host ""

# ============================================
# 5. Verificar Auth Service
# ============================================
Write-Host "🔐 Verificando validación en Auth Service..." -ForegroundColor Yellow

Check-Code "services/auth-service/src/middleware/validation.js" "validateEmail" "Email validation"
Check-Code "services/auth-service/src/middleware/validation.js" "validatePassword" "Password validation"
Check-Code "services/auth-service/src/middleware/validation.js" "sanitize" "Input sanitization"

Write-Host ""

# ============================================
# 6. Verificar Ports Configurados
# ============================================
Write-Host "🔌 Verificando configuración de puertos..." -ForegroundColor Yellow

Check-Code "api-gateway/src/index.js" "3000" "API Gateway puerto 3000"
Check-Code "services/auth-service/src/index.js" "3001" "Auth Service puerto 3001"

Write-Host ""

# ============================================
# 7. Resultados
# ============================================
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 RESULTADOS DE VALIDACIÓN" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✓ Pasados: $PASSED" -ForegroundColor Green
Write-Host "✗ Fallidos: $FAILED" -ForegroundColor Red
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if ($FAILED -eq 0) {
  Write-Host "✅ ¡TODAS LAS VERIFICACIONES PASARON!" -ForegroundColor Green
  Write-Host ""
  Write-Host "Próximos pasos:" -ForegroundColor Green
  Write-Host "1. npm install en api-gateway" -ForegroundColor Green
  Write-Host "2. npm install en cada servicio" -ForegroundColor Green
  Write-Host "3. docker-compose up" -ForegroundColor Green
  Write-Host "4. Acceder a: http://localhost:3000/health" -ForegroundColor Green
  exit 0
} else {
  Write-Host "❌ EXISTEN PROBLEMAS A RESOLVER" -ForegroundColor Red
  Write-Host ""
  Write-Host "Correcciones necesarias:" -ForegroundColor Yellow
  Write-Host "1. Crear archivos faltantes" -ForegroundColor Yellow
  Write-Host "2. Actualizar package.json con dependencias" -ForegroundColor Yellow
  Write-Host "3. Copiar .env.example a .env" -ForegroundColor Yellow
  Write-Host "4. Ejecutar: npm install" -ForegroundColor Yellow
  exit 1
}
