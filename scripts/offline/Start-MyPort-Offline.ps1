[CmdletBinding()]
param([switch]$NoBrowser)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$composeFile = Join-Path $projectRoot 'docker-compose.offline.yml'

docker compose -f $composeFile up -d
if ($LASTEXITCODE -ne 0) { throw 'ไม่สามารถเปิด My Port Offline ได้' }

& (Join-Path $PSScriptRoot 'Apply-ActivityLogsMigration.ps1')
& (Join-Path $PSScriptRoot 'Apply-BackupRestoreMigration.ps1')

Write-Host 'My Port Offline พร้อมใช้งานที่ http://localhost:3020'
if (-not $NoBrowser) { Start-Process 'http://localhost:3020' }
