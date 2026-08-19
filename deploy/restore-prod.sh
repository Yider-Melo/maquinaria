#!/usr/bin/env bash
# ============================================================
# Restaura en producción los dumps generados con scripts/dump-local.ps1
# Uso:
#   1) En tu PC:  powershell -File scripts/dump-local.ps1
#   2) Sube la carpeta de dumps:
#      scp -r <ruta>\dump\* root@<IP>:/root/maquinaria/dumps/
#   3) En el servidor:  bash deploy/restore-prod.sh
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."

DUMPS_DIR="/root/maquinaria/dumps"
DB_USER=$(grep '^DB_USER=' .env | head -n1 | cut -d'=' -f2)
DB_USER=${DB_USER:-postgres}

if [ ! -d "$DUMPS_DIR" ]; then
    echo "No existe $DUMPS_DIR. Sube los dumps primero."
    exit 1
fi

echo "==> Usuario de BD detectado: $DB_USER"

COMPOSE="docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml"

echo "==> Deteniendo servicios de aplicación (las BD siguen arriba)..."
$COMPOSE stop api-gateway auth-service machinery-service search-service booking-service payment-service rating-service notification-service frontend

restore_db() {
    local container=$1 db=$2
    if [ ! -f "$DUMPS_DIR/$db.sql" ]; then
        echo "  (no existe $DUMPS_DIR/$db.sql, se omite $db)"
        return
    fi
    echo "==> Restaurando $db ..."
    docker exec -i "$container" psql -U "$DB_USER" -d "$db" -v ON_ERROR_STOP=1 < "$DUMPS_DIR/$db.sql"
    echo "   OK -> $db"
}

restore_db maquinaria-auth-db-1        rentamaq_auth
restore_db maquinaria-machinery-db-1   rentamaq_machinery
restore_db maquinaria-search-db-1      rentamaq_search
restore_db maquinaria-booking-db-1     rentamaq_booking
restore_db maquinaria-payment-db-1     rentamaq_payment
restore_db maquinaria-rating-db-1      rentamaq_rating
restore_db maquinaria-notification-db-1 rentamaq_notification

echo "==> Iniciando servicios de aplicación..."
$COMPOSE start api-gateway auth-service machinery-service search-service booking-service payment-service rating-service notification-service frontend

echo "========================================"
echo "  MIGRACIÓN COMPLETADA"
echo "========================================"
