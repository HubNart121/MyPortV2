[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$BackupJson,
  [switch]$SkipFileMigration
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$composeFile = Join-Path $projectRoot 'docker-compose.offline.yml'
$backupPath = (Resolve-Path -LiteralPath $BackupJson).Path

docker compose -f (Join-Path $projectRoot 'docker-compose.dev.yml') stop
docker compose -f $composeFile up -d --build
if ($LASTEXITCODE -ne 0) { throw 'Build หรือเปิด Offline Stack ไม่สำเร็จ' }

& (Join-Path $PSScriptRoot 'Apply-ActivityLogsMigration.ps1')
& (Join-Path $PSScriptRoot 'Apply-BackupRestoreMigration.ps1')

$ready = $false
for ($attempt = 1; $attempt -le 60; $attempt++) {
  try {
    $response = Invoke-WebRequest -Uri 'http://localhost:3020' -UseBasicParsing -TimeoutSec 3
    if ($response.StatusCode -eq 200) { $ready = $true; break }
  } catch { Start-Sleep -Seconds 2 }
}
if (-not $ready) { throw 'Offline Web ยังไม่พร้อมหลังรอ 2 นาที' }

$restore = Invoke-RestMethod -Method Post `
  -Uri 'http://localhost:3020/api/local/restore' `
  -Headers @{ Origin = 'http://localhost:3020' } `
  -ContentType 'application/json' `
  -InFile $backupPath

Write-Host ('Restore สำเร็จ: ' + ($restore.counts | ConvertTo-Json -Compress))
if (-not $SkipFileMigration) {
  & (Join-Path $PSScriptRoot 'Migrate-Firebase-Files.ps1')
}
Write-Host 'ติดตั้งเสร็จแล้ว เปิด http://localhost:3020'
