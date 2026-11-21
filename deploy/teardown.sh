#!/usr/bin/env bash
# MoneyLog - delete the paid GCP resources AFTER grading ends. Asks before deleting.
set -euo pipefail
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"; REGION="${REGION:-asia-southeast1}"
read -r -p "Delete Cloud Run, Cloud SQL, images and secrets of MoneyLog in ${PROJECT_ID}? Type the project id: " ok
[ "$ok" = "$PROJECT_ID" ] || { echo "Cancelled."; exit 1; }
gcloud run services delete moneylog --region "$REGION" --project "$PROJECT_ID" --quiet || true
gcloud run jobs delete moneylog-migrate --region "$REGION" --project "$PROJECT_ID" --quiet || true
gcloud sql instances delete moneylog-pg --project "$PROJECT_ID" --quiet || true
gcloud artifacts repositories delete moneylog --location "$REGION" --project "$PROJECT_ID" --quiet || true
for s in moneylog-database-url moneylog-admin-password moneylog-demo-password; do gcloud secrets delete "$s" --project "$PROJECT_ID" --quiet || true; done
echo "Teardown finished."
