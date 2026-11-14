#!/usr/bin/env bash
# Runs every build and test command for a release and saves the output with the commit id.
# Usage: bash scripts/verify-release.sh   (needs PostgreSQL running and server/.env)
set -uo pipefail
cd "$(dirname "$0")/.."
OUT=docs/sprints/sprint-1/evidence/release-run.txt
{
  echo "Commit: $(git rev-parse HEAD)  ($(git log -1 --format=%cd --date=iso))"
  echo "Branch: $(git rev-parse --abbrev-ref HEAD)"
  echo; echo "== npm run build --prefix server"; npm run build --prefix server 2>&1 | grep -v "npm notice" | tail -3; ls server/dist/index.js
  echo; echo "== npm run build --prefix client"; npm run build --prefix client 2>&1 | tail -4
  echo; echo "== npm test --prefix server"; npm test --prefix server 2>&1 | grep -E "✓|×|↓|Test Files|Tests |Duration"
  echo; echo "== npm test --prefix client"; npm test --prefix client 2>&1 | grep -E "✓|×|↓|Test Files|Tests |Duration"
  echo; echo "== npx playwright test"; npx playwright test 2>&1 | grep -E "✓|✘|-  |passed|failed|skipped"
} | tee "$OUT"
echo "Saved to $OUT"
