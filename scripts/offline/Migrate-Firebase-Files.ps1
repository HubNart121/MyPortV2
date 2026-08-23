[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$origin = 'http://localhost:3020'
$records = Invoke-RestMethod -Uri "$origin/rest/v1/files?select=*" -Headers @{ Accept = 'application/json' }
$report = [System.Collections.Generic.List[object]]::new()

foreach ($record in $records) {
  if ($record.storage_kind -eq 'local' -or [string]::IsNullOrWhiteSpace($record.link)) { continue }
  $temporaryFile = Join-Path ([IO.Path]::GetTempPath()) ("myport-migrate-" + [guid]::NewGuid().ToString())
  try {
    Invoke-WebRequest -Uri $record.link -OutFile $temporaryFile -MaximumRedirection 5 -UseBasicParsing
    $fileInfo = Get-Item -LiteralPath $temporaryFile
    if ($fileInfo.Length -gt 20MB) { throw 'ไฟล์เกิน 20 MB' }
    $upload = Invoke-RestMethod -Method Post -Uri "$origin/api/local-files" -Headers @{ Origin = $origin } -Form @{
      file = $fileInfo
    }
    $payload = @{
      storage_kind = 'local'
      stored_name = $upload.stored_name
      original_name = $(if ($upload.original_name) { $upload.original_name } else { $record.name })
      mime_type = $upload.mime_type
      size_bytes = $upload.size_bytes
      link = "/api/local-files/$($record.id)"
    } | ConvertTo-Json
    Invoke-RestMethod -Method Patch -Uri "$origin/rest/v1/files?id=eq.$($record.id)" -ContentType 'application/json' -Body $payload | Out-Null
    $report.Add([pscustomobject]@{ id = $record.id; name = $record.name; status = 'downloaded' })
  } catch {
    $report.Add([pscustomobject]@{ id = $record.id; name = $record.name; status = 'failed'; error = $_.Exception.Message })
  } finally {
    if (Test-Path -LiteralPath $temporaryFile) { Remove-Item -LiteralPath $temporaryFile -Force }
  }
}

$report | Format-Table -AutoSize
$failed = @($report | Where-Object status -eq 'failed')
if ($failed.Count -gt 0) { throw "ดาวน์โหลดไฟล์เดิมไม่สำเร็จ $($failed.Count) รายการ" }
Write-Host "ย้ายไฟล์แนบสำเร็จ $(@($report).Count) รายการ"
