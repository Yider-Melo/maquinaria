@echo off
title Rentamaq - Inicio de Servicios
echo ============================================
echo   Rentamaq - Plataforma de Alquiler
echo   Iniciando todos los microservicios...
echo ============================================
echo.

set ROOT=%~dp0
set ROOT=%ROOT:~0,-1%

:: Verificar que PostgreSQL este corriendo
echo [1/8] Verificando PostgreSQL...
pg_isready -h localhost -p 5432 >nul 2>&1
if %errorlevel% neq 0 (
    echo   !ERROR: PostgreSQL no esta corriendo en localhost:5432
    echo   Por favor inicia PostgreSQL antes de continuar.
    pause
    exit /b 1
)
echo   PostgreSQL OK
echo.

:: Iniciar Auth Service
echo [2/8] Iniciando Auth Service (puerto 3001)...
start "Auth Service" cmd /c "cd /d "%ROOT%\services\auth-service" && npm install >nul 2>&1 && npm run dev"

:: Iniciar Machinery Service
echo [3/8] Iniciando Machinery Service (puerto 3002)...
start "Machinery Service" cmd /c "cd /d "%ROOT%\services\machinery-service" && npm install >nul 2>&1 && npm run dev"

:: Iniciar Search Service
echo [4/8] Iniciando Search Service (puerto 3003)...
start "Search Service" cmd /c "cd /d "%ROOT%\services\search-service" && npm install >nul 2>&1 && npm run dev"

:: Iniciar Booking Service
echo [5/8] Iniciando Booking Service (puerto 3004)...
start "Booking Service" cmd /c "cd /d "%ROOT%\services\booking-service" && npm install >nul 2>&1 && npm run dev"

:: Iniciar Payment Service
echo [6/8] Iniciando Payment Service (puerto 3005)...
start "Payment Service" cmd /c "cd /d "%ROOT%\services\payment-service" && npm install >nul 2>&1 && npm run dev"

:: Iniciar Rating Service
echo [7/8] Iniciando Rating Service (puerto 3006)...
start "Rating Service" cmd /c "cd /d "%ROOT%\services\rating-service" && npm install >nul 2>&1 && npm run dev"

:: Iniciar Notification Service
echo [8/8] Iniciando Notification Service (puerto 3007)...
start "Notification Service" cmd /c "cd /d "%ROOT%\services\notification-service" && npm install >nul 2>&1 && npm run dev"

:: Esperar 5 segundos para que los servicios se inicialicen
echo.
echo Esperando 5 segundos para que los servicios se inicialicen...
timeout /t 5 /nobreak >nul

:: Iniciar API Gateway
echo.
echo Iniciando API Gateway (puerto 3000)...
start "API Gateway" cmd /c "cd /d "%ROOT%\api-gateway" && npm install >nul 2>&1 && npm run dev"

echo.
echo ============================================
echo   Todos los servicios estan iniciandose.
echo   Ventanas de terminal abiertas para cada servicio.
echo.
echo   API Gateway:     http://localhost:3000
echo   Auth Service:    http://localhost:3001
echo   Machinery Svc:   http://localhost:3002
echo   Search Service:  http://localhost:3003
echo   Booking Service: http://localhost:3004
echo   Payment Service: http://localhost:3005
echo   Rating Service:  http://localhost:3006
echo   Notification:    http://localhost:3007
echo ============================================
echo.
pause
