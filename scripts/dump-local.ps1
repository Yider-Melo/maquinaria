$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$DumpDir = Join-Path $env:TEMP "opencode\dump"
New-Item -ItemType Directory -Force -Path $DumpDir | Out-Null

$DBs = @(
    @{ Container = 'maquinaria-auth-db-1';        Db = 'rentamaq_auth' },
    @{ Container = 'maquinaria-machinery-db-1';   Db = 'rentamaq_machinery' },
    @{ Container = 'maquinaria-search-db-1';      Db = 'rentamaq_search' },
    @{ Container = 'maquinaria-booking-db-1';     Db = 'rentamaq_booking' },
    @{ Container = 'maquinaria-payment-db-1';     Db = 'rentamaq_payment' },
    @{ Container = 'maquinaria-rating-db-1';      Db = 'rentamaq_rating' },
    @{ Container = 'maquinaria-notification-db-1'; Db = 'rentamaq_notification' }
)

foreach ($db in $DBs) {
    Write-Host "==> Dumping $($db.Db) desde $($db.Container)..."
    docker exec $db.Container pg_dump -U postgres -d $db.Db --clean --if-exists --no-owner --no-privileges -f "/tmp/$($db.Db).sql"
    if ($LASTEXITCODE -ne 0) { throw "Fallo pg_dump de $($db.Db)" }
    docker cp "$($db.Container):/tmp/$($db.Db).sql" (Join-Path $DumpDir "$($db.Db).sql")
    docker exec $db.Container rm -f "/tmp/$($db.Db).sql"
    Write-Host "   OK -> $DumpDir\$($db.Db).sql"
}

Write-Host ""
Write-Host "Dumps completados en: $DumpDir"
Get-ChildItem $DumpDir | Select-Object Name, Length | Format-Table -AutoSize
