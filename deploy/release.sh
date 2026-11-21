#!/usr/bin/env bash
# MoneyLog - release one image (called by .github/workflows/deploy.yml).
# Verifies the image tagged with the commit SHA exists, runs the migration job
# (skipped for a rollback), then points the service at the image DIGEST.
set -euo pipefail
: "${PROJECT_ID:?required}" "${REGION:?required}" "${IMAGE_TAG:?required}"
SERVICE="${SERVICE_NAME:-moneylog}"; JOB="${MIGRATE_JOB_NAME:-moneylog-migrate}"; ROLLBACK="${ROLLBACK:-false}"
[[ "$IMAGE_TAG" =~ ^[0-9a-f]{40}$ ]] || { echo "IMAGE_TAG must be a full 40-character commit SHA." >&2; exit 1; }
[[ "$ROLLBACK" == true || "$ROLLBACK" == false ]] || { echo "ROLLBACK must be true or false." >&2; exit 1; }

BASE="${REGION}-docker.pkg.dev/${PROJECT_ID}/moneylog/moneylog"
DIGEST="$(gcloud artifacts docker images describe "${BASE}:${IMAGE_TAG}" --project="$PROJECT_ID" --format='value(image_summary.fully_qualified_digest)')"
[[ "$DIGEST" == "${BASE}@sha256:"* ]] || { echo "Image ${BASE}:${IMAGE_TAG} not found." >&2; exit 1; }

if [[ "$ROLLBACK" == false ]]; then
  gcloud run jobs update "$JOB" --image="$DIGEST" --project="$PROJECT_ID" --region="$REGION" --quiet
  gcloud run jobs execute "$JOB" --wait --project="$PROJECT_ID" --region="$REGION" --quiet
else
  echo "Rollback: reusing image ${IMAGE_TAG}; migration skipped (migrations are additive)."
fi
gcloud run services update "$SERVICE" --image="$DIGEST" --project="$PROJECT_ID" --region="$REGION" --quiet
gcloud run services update-traffic "$SERVICE" --to-latest --project="$PROJECT_ID" --region="$REGION" --quiet
URL="$(gcloud run services describe "$SERVICE" --project="$PROJECT_ID" --region="$REGION" --format='value(status.url)')"
echo "Service URL: ${URL}"
if [[ -n "${GITHUB_ENV:-}" ]]; then printf 'SERVICE_URL=%s\nDEPLOYED_IMAGE=%s\n' "$URL" "$DIGEST" >> "$GITHUB_ENV"; fi
