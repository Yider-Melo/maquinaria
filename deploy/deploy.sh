#!/usr/bin/env bash
# ============================================================
# Despliegue de RentaMaq en producción (Debian/Ubuntu)
# Uso:  sudo bash deploy/deploy.sh
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Verificando Docker..."
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker no instalado. Instalalo con:"
  echo "  curl -fsSL https://get.docker.com | sh"
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose v2 no instalado. Ejecuta:"
  echo "  sudo apt install -y docker-compose-plugin"
  exit 1
fi

echo "==> Preparando .env..."
if [ ! -f .env ]; then
  if [ -f deploy/.env.production.example ]; then
    cp deploy/.env.production.example .env
    echo "  Se creó .env desde la plantilla. EDITA los valores antes de continuar."
    exit 1
  fi
  echo "Falta el archivo .env"
  exit 1
fi

echo "==> Verificando que las credenciales de cobro sean de producción..."
if grep -q "pub_test_" .env; then
  echo "ADVERTENCIA: WOMPI_PUBLIC_KEY es de prueba (pub_test_)."
  read -r -p "¿Continuar de todos modos? [s/N] " resp
  [[ "$resp" =~ ^[sS]$ ]] || exit 1
fi

echo "==> Construyendo e iniciando todos los servicios..."
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml up -d --build

echo "==> Estado de los contenedores..."
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml ps

echo "==> Configurando firewall (ufw)..."
if command -v ufw >/dev/null 2>&1; then
  ufw allow 22/tcp    # SSH
  ufw allow 80/tcp    # HTTP (redirige a HTTPS)
  ufw allow 443/tcp   # HTTPS
  ufw deny 3100/tcp   # puerto interno del gateway, no exponer
  ufw --force enable
fi

echo "==> Listo. Revisa la consola del gateway:"
echo "  docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml logs -f api-gateway"
echo "==> Recuerda registrar el webhook de Wompi: ${PUBLIC_URL:-https://<tu-dominio>}/api/v1/payments/webhook"
