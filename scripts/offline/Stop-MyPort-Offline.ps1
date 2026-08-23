[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$composeFile = Join-Path $projectRoot 'docker-compose.offline.yml'

docker compose -f $composeFile stop
if ($LASTEXITCODE -ne 0) { throw 'ไม่สามารถหยุด My Port Offline ได้' }
Write-Host 'หยุด My Port Offline แล้ว โดยข้อมูลและไฟล์ยังอยู่ใน Docker Volume'
