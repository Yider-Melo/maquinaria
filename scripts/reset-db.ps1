$ErrorActionPreference = 'Stop'

function Invoke-Sql {
    param([string]$Container, [string]$Database, [string]$Sql)
    $Sql | docker exec -i $Container psql -U postgres -d $Database
}

$databases = @(
    @{ Container = 'maquinaria-auth-db-1';        DB = 'rentamaq_auth';       Table = 'usuarios' },
    @{ Container = 'maquinaria-machinery-db-1';   DB = 'rentamaq_machinery';  Table = 'disponibilidad_maquinaria, imagen_maquinaria, maquinaria' },
    @{ Container = 'maquinaria-booking-db-1';     DB = 'rentamaq_booking';    Table = 'reserva' },
    @{ Container = 'maquinaria-payment-db-1';     DB = 'rentamaq_payment';    Table = 'pago' },
    @{ Container = 'maquinaria-rating-db-1';      DB = 'rentamaq_rating';     Table = 'calificacion' },
    @{ Container = 'maquinaria-notification-db-1'; DB = 'rentamaq_notification'; Table = 'notificacion' },
    @{ Container = 'maquinaria-search-db-1';      DB = 'rentamaq_search';     Table = 'maquinaria' }
)

foreach ($db in $databases) {
    $tables = $db.Table -split ', '
    $truncate = ($tables | ForEach-Object { "TRUNCATE TABLE $_ CASCADE;" }) -join ' '
    Write-Host "Limpiando $($db.DB)..."
    try {
        Invoke-Sql -Container $db.Container -Database $db.DB -Sql $truncate
        Write-Host "  OK" -ForegroundColor Green
    } catch {
        Write-Host "  Error: $_" -ForegroundColor Red
    }
}

Write-Host "`nTodas las bases de datos limpiadas." -ForegroundColor Green
Write-Host "Ejecuta '.\scripts\seed-demo.ps1' para recargar datos de prueba." -ForegroundColor Yellow
