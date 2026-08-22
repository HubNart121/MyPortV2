[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$composeFile = Join-Path $projectRoot 'docker-compose.offline.yml'
$migration = Join-Path $projectRoot 'docker\db\10-activity-logs.sql'

if (-not (Test-Path -LiteralPath $migration)) {
  throw "Activity Logs migration not found: $migration"
}

$sql = Get-Content -LiteralPath $migration -Raw
docker compose -f $composeFile exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c $sql
if ($LASTEXITCODE -ne 0) {
  throw 'Apply Activity Logs migration failed'
}
