# Aegis / Overwatch — Windows pre-deploy gate (PowerShell)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

Write-Host "==> [harden] check-env (set env in Vercel or dot-source a secrets file first)"
node scripts/check-env.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> [harden] prisma generate"
npx prisma generate

Write-Host "==> [harden] sovereign tests"
npm run test

Write-Host "==> [harden] next build"
npm run build

Write-Host "==> [harden] DONE"
