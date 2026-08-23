[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$composeFile = Join-Path $projectRoot 'docker-compose.offline.yml'
$schemaMigration = Join-Path $projectRoot '04-add-expected-dividend-per-year.sql'
$riskCategoryMigration = Join-Path $projectRoot '05-add-risk-category.sql'
$restoreMigration = Join-Path $projectRoot 'docker\db\09-offline-restore.sql'

foreach ($migration in @($schemaMigration, $riskCategoryMigration, $restoreMigration)) {
  if (-not (Test-Path -LiteralPath $migration)) {
    throw "Backup/Restore migration not found: $migration"
  }

  Get-Content -LiteralPath $migration -Raw |
    docker compose -f $composeFile exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1
  if ($LASTEXITCODE -ne 0) {
    throw "Apply Backup/Restore migration failed: $migration"
  }
}
