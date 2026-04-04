#!/usr/bin/env bash
# Aegis / Overwatch — one-command pre-deploy gate (Unix/Git Bash/WSL)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> [harden] check-env (load secrets from hosting or: export \$(cat .env.production | xargs))"
node scripts/check-env.mjs

echo "==> [harden] prisma generate"
npx prisma generate

echo "==> [harden] sovereign tests (vortex + gas)"
npm run test

echo "==> [harden] next build (PWA / service worker)"
npm run build

echo "==> [harden] DONE — review public/sw.js if PWA enabled for production."
