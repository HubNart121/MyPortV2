[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$BackupZip,
  [Parameter(Mandatory = $true)]
  [ValidateSet('RESTORE')]
  [string]$Confirm
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$composeFile = Join-Path $projectRoot 'docker-compose.offline.yml'
$zipPath = (Resolve-Path -LiteralPath $BackupZip).Path
$temporaryRoot = Join-Path ([IO.Path]::GetTempPath()) ("myport-restore-" + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $temporaryRoot | Out-Null

try {
  Expand-Archive -LiteralPath $zipPath -DestinationPath $temporaryRoot
  $manifestPath = Join-Path $temporaryRoot 'manifest.json'
  $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  $backupJsonName = if (Test-Path -LiteralPath (Join-Path $temporaryRoot 'backup-v5.json')) {
    'backup-v5.json'
  } elseif (Test-Path -LiteralPath (Join-Path $temporaryRoot 'backup-v4.json')) {
    'backup-v4.json'
  } else {
    throw 'ไม่พบ backup-v5.json หรือ backup-v4.json ในชุด Backup'
  }
  foreach ($name in @($backupJsonName, 'postgres.dump', 'uploads.tar.gz')) {
    $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $temporaryRoot $name)).Hash
    if ($actual -ne $manifest.sha256.$name) { throw "Checksum ไม่ผ่าน: $name" }
  }

  $testVolume = 'my-port-v2-offline-restore-test-' + [guid]::NewGuid().ToString('N')
  docker volume create $testVolume | Out-Null
  try {
    docker run -d --name my-port-v2-offline-restore-test `
      -e POSTGRES_PASSWORD=test `
      -v "${testVolume}:/var/lib/postgresql/data" `
      postgres:16-alpine | Out-Null
    for ($attempt = 1; $attempt -le 30; $attempt++) {
      docker exec my-port-v2-offline-restore-test pg_isready -U postgres 2>$null | Out-Null
      if ($LASTEXITCODE -eq 0) { break }
      Start-Sleep -Seconds 1
    }
    docker cp (Join-Path $temporaryRoot 'postgres.dump') 'my-port-v2-offline-restore-test:/tmp/postgres.dump'
    docker exec my-port-v2-offline-restore-test pg_restore -U postgres -d postgres /tmp/postgres.dump
    if ($LASTEXITCODE -ne 0) { throw 'ทดสอบกู้ PostgreSQL ไม่ผ่าน' }
    docker exec my-port-v2-offline-restore-test psql -U postgres -d postgres -c 'SELECT COUNT(*) AS stocks FROM public.stocks;'
    if ($LASTEXITCODE -ne 0) { throw 'ตรวจฐานข้อมูลทดสอบไม่ผ่าน' }
  } finally {
    docker rm -f my-port-v2-offline-restore-test 2>$null | Out-Null
    docker volume rm $testVolume 2>$null | Out-Null
  }

  & (Join-Path $PSScriptRoot 'Backup-MyPort-Offline.ps1')
  docker compose -f $composeFile stop web api postgrest
  docker cp (Join-Path $temporaryRoot 'postgres.dump') 'my-port-v2-offline-db:/tmp/postgres.dump'
  docker exec my-port-v2-offline-db pg_restore -U postgres --clean --if-exists -d postgres /tmp/postgres.dump
  if ($LASTEXITCODE -ne 0) { throw 'กู้ PostgreSQL หลักไม่สำเร็จ' }

  docker run --rm `
    -v 'my-port-v2-offline-uploads:/data' `
    -v "${temporaryRoot}:/backup:ro" `
    alpine:latest sh -c 'find /data -mindepth 1 -maxdepth 1 -exec rm -rf -- {} + && tar -xzf /backup/uploads.tar.gz -C /data'
  if ($LASTEXITCODE -ne 0) { throw 'กู้ไฟล์อัปโหลดไม่สำเร็จ' }
  docker run --rm -v 'my-port-v2-offline-uploads:/data' alpine:latest chown -R 1001:1001 /data
  docker compose -f $composeFile up -d
  Write-Host 'กู้คืนข้อมูล Offline สำเร็จ กรุณาเปิดแอปอีกครั้ง'
} finally {
  if (Test-Path -LiteralPath $temporaryRoot) { Remove-Item -LiteralPath $temporaryRoot -Recurse -Force }
}
