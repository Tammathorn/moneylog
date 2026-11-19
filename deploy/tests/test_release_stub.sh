#!/usr/bin/env bash
# Offline test: release.sh against a fake gcloud that records its calls.
set -euo pipefail
cd "$(dirname "$0")/../.."
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
cat > "$tmp/gcloud" <<'FAKE'
#!/usr/bin/env bash
echo "$*" >> "$GCLOUD_LOG"
case "$*" in
  "artifacts docker images describe"*) echo "asia-southeast1-docker.pkg.dev/p/moneylog/moneylog@sha256:abc" ;;
  "run services describe"*) echo "https://moneylog-x.a.run.app" ;;
esac
FAKE
chmod +x "$tmp/gcloud"
export PATH="$tmp:$PATH" PROJECT_ID=p REGION=asia-southeast1
fail() { echo "FAIL: $1"; exit 1; }
SHA=0123456789abcdef0123456789abcdef01234567

GCLOUD_LOG="$tmp/a" IMAGE_TAG=$SHA bash deploy/release.sh >/dev/null
grep -q "run jobs execute moneylog-migrate" "$tmp/a" || fail "migration not run"
grep -q "run services update moneylog --image=asia-southeast1-docker.pkg.dev/p/moneylog/moneylog@sha256:abc" "$tmp/a" || fail "not deployed by digest"
[ "$(grep -n 'jobs execute' "$tmp/a" | cut -d: -f1)" -lt "$(grep -n 'services update ' "$tmp/a" | cut -d: -f1)" ] || fail "migrate after deploy"

GCLOUD_LOG="$tmp/b" IMAGE_TAG=$SHA ROLLBACK=true bash deploy/release.sh >/dev/null
grep -q "jobs" "$tmp/b" && fail "rollback ran the migration"
grep -q "run services update moneylog" "$tmp/b" || fail "rollback did not deploy"

GCLOUD_LOG="$tmp/c" IMAGE_TAG=abc123 bash deploy/release.sh >/dev/null 2>&1 && fail "accepted a short tag"
echo "PASS release.sh (deploy, rollback, tag validation)"
