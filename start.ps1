$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$bun = Join-Path $env:USERPROFILE ".bun\bin\bun.exe"

if (-not (Test-Path $bun)) {
  Write-Host "Bun not found. Install from https://bun.sh" -ForegroundColor Red
  exit 1
}

$env:Path = "$(Split-Path $bun);$env:Path"

Write-Host "Starting Lustpress on http://localhost:3000 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location '$root\lustpress'; & '$bun' run start:prod"
)

Start-Sleep -Seconds 4

Write-Host "Starting video player on http://localhost:8080 ..." -ForegroundColor Cyan
Write-Host "Open http://localhost:8080 — use the Indian tab to play Auntymaza videos here." -ForegroundColor Yellow
Set-Location $root
npm run start
