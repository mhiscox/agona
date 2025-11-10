#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "==> Installing dependencies"
npm install --prefer-offline --no-audit --progress=false

echo "==> Linting"
npm run lint

echo "==> Building"
npm run build

if command -v vercel >/dev/null 2>&1; then
  VC_CLI="vercel"
else
  VC_CLI="npx vercel"
fi

echo "==> Pulling env from Vercel"
$VC_CLI pull --yes --environment=production

echo "==> Deploying prebuilt output"
$VC_CLI deploy --prod --prebuilt
