#!/usr/bin/env bash
# Offline test: deploy.sh dry run prints the expected plan and no password.
set -euo pipefail
cd "$(dirname "$0")/../.."
out="$(DRY_RUN=1 PROJECT_ID=test-proj bash deploy/deploy.sh --demo)"
fail() { echo "FAIL: $1"; exit 1; }
for want in "sql instances create moneylog-pg" "--tier=db-f1-micro" "--no-storage-auto-increase" \
  "run jobs deploy moneylog-migrate" "run jobs execute moneylog-migrate" "run deploy moneylog " \
  "--min-instances 0" "--max-instances 2" "DEMO_USER_PASSWORD=moneylog-demo-password:latest" "COOKIE_SECURE=true"; do
  grep -qF -- "$want" <<<"$out" || fail "missing '$want'"
done
grep -q -- "--password=<REDACTED>" <<<"$out" || fail "password not redacted"
if grep -Eq -- "--password=[^<]" <<<"$out"; then fail "a password was printed"; fi
# Migration runs before the service update.
[ "$(grep -n 'jobs execute' <<<"$out" | cut -d: -f1)" -lt "$(grep -n 'run deploy moneylog ' <<<"$out" | cut -d: -f1)" ] || fail "order"
# Without --demo there is no demo password secret.
DRY_RUN=1 PROJECT_ID=test-proj bash deploy/deploy.sh | grep -q moneylog-demo-password && fail "demo secret without --demo"
DRY_RUN=1 bash deploy/deploy.sh --bogus >/dev/null 2>&1 && fail "accepted an unknown flag"
echo "PASS deploy.sh dry run"
