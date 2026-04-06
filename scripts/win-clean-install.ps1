# Repair broken node_modules on Windows after EPERM / partial npm install.
# Run from repo root in PowerShell (Admin if needed). Stop `next dev` first.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "Stopping stray Node processes for this folder (optional)..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | ForEach-Object { $_.Path }

if (Test-Path .\node_modules) {
  Write-Host "Removing node_modules..." -ForegroundColor Cyan
  Remove-Item -Recurse -Force .\node_modules
}

if (Test-Path .\package-lock.json) {
  npm ci
} else {
  npm install
}

Write-Host "Done. Run: npm run build" -ForegroundColor Green
