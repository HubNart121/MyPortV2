[CmdletBinding()]
param(
  [string]$Destination = (Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'MyPort-Offline-Backups')
)

$ErrorActionPreference = 'Stop'
$destinationPath = [IO.Path]::GetFullPath($Destination)
New-Item -ItemType Directory -Path $destinationPath -Force | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$workingPath = Join-Path $destinationPath "my-port-offline-$stamp"
New-Item -ItemType Directory -Path $workingPath -Force | Out-Null

$jsonPath = Join-Path $workingPath 'backup-v5.json'
Invoke-WebRequest -Uri 'http://localhost:3020/api/local/backup' -OutFile $jsonPath -UseBasicParsing

docker exec my-port-v2-offline-db pg_dump -U postgres -Fc -f /tmp/my-port.dump postgres
if ($LASTEXITCODE -ne 0) { throw 'สำรอง PostgreSQL ไม่สำเร็จ' }
docker cp 'my-port-v2-offline-db:/tmp/my-port.dump' (Join-Path $workingPath 'postgres.dump')
if ($LASTEXITCODE -ne 0) { throw 'คัดลอก PostgreSQL Backup ไม่สำเร็จ' }

docker run --rm `
  -v 'my-port-v2-offline-uploads:/source:ro' `
  -v "${workingPath}:/backup" `
  alpine:latest tar -czf /backup/uploads.tar.gz -C /source .
if ($LASTEXITCODE -ne 0) { throw 'สำรองไฟล์อัปโหลดไม่สำเร็จ' }

$files = @('backup-v5.json', 'postgres.dump', 'uploads.tar.gz')
$checksums = @{}
foreach ($file in $files) {
  $checksums[$file] = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $workingPath $file)).Hash
}
$manifest = [ordered]@{
  format = 'my-port-v2-offline-bundle'
  created_at = (Get-Date).ToUniversalTime().ToString('o')
  sha256 = $checksums
}
$manifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $workingPath 'manifest.json') -Encoding utf8

$zipPath = "$workingPath.zip"
Compress-Archive -Path (Join-Path $workingPath '*') -DestinationPath $zipPath -CompressionLevel Optimal
Write-Host "สำรองข้อมูลสำเร็จ: $zipPath"
