#!/usr/bin/env bash
# MoneyLog - one-time GCP setup and first deploy (Lab 5 #5). Run in Cloud Shell:
#   DRY_RUN=1 PROJECT_ID=<id> bash deploy/deploy.sh --demo   # print the plan only
#   PROJECT_ID=<id> bash deploy/deploy.sh --demo             # create + deploy
# Idempotent: existing resources are kept. Generated passwords go straight into
# Secret Manager and are never printed.
set -euo pipefail

DRY_RUN="${DRY_RUN:-0}"
REGION="${REGION:-asia-southeast1}"
SEED_DEMO_DATA="false"
for arg in "$@"; do
  case "$arg" in
    --demo) SEED_DEMO_DATA="true" ;;
    *) echo "Usage: $0 [--demo]" >&2; exit 1 ;;
  esac
done

run() {  # print a command (passwords redacted), then run it unless DRY_RUN=1
  local a
  if [ "$DRY_RUN" = "1" ]; then printf '[DRY_RUN] '; else printf '+ '; fi
  for a in "$@"; do case "$a" in --password=*) printf '%s ' '--password=<REDACTED>' ;; *) printf '%q ' "$a" ;; esac; done
  printf '\n'
  if [ "$DRY_RUN" != "1" ]; then "$@"; fi
}
exists() { [ "$DRY_RUN" != "1" ] && "$@" >/dev/null 2>&1; }

if [ "$DRY_RUN" = "1" ]; then PROJECT_ID="${PROJECT_ID:-example-project}"
else PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"; fi
[ -n "$PROJECT_ID" ] || { echo "Set PROJECT_ID or run: gcloud config set project <id>" >&2; exit 1; }

REPO=moneylog; SERVICE=moneylog; JOB=moneylog-migrate
SQL=moneylog-pg; DB=moneylog; DB_USER=moneylog
SA_NAME=moneylog-runner; SA="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
CONN="${PROJECT_ID}:${REGION}:${SQL}"
SHA="$(git rev-parse HEAD 2>/dev/null || echo 0000000000000000000000000000000000000000)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${SERVICE}:${SHA}"
S_DB=moneylog-database-url; S_ADMIN=moneylog-admin-password; S_DEMO=moneylog-demo-password

echo "MoneyLog deploy | project=${PROJECT_ID} region=${REGION} demo=${SEED_DEMO_DATA} dry_run=${DRY_RUN}"

run gcloud services enable run.googleapis.com sqladmin.googleapis.com artifactregistry.googleapis.com \
  cloudbuild.googleapis.com secretmanager.googleapis.com iam.googleapis.com --project "$PROJECT_ID"

exists gcloud artifacts repositories describe "$REPO" --location "$REGION" --project "$PROJECT_ID" ||
  run gcloud artifacts repositories create "$REPO" --repository-format=docker --location "$REGION" --project "$PROJECT_ID"

# Smallest Cloud SQL tier, storage auto-increase off (cost control).
exists gcloud sql instances describe "$SQL" --project "$PROJECT_ID" ||
  run gcloud sql instances create "$SQL" --database-version=POSTGRES_16 --edition=enterprise --tier=db-f1-micro \
    --region="$REGION" --storage-size=10GB --storage-type=SSD --no-storage-auto-increase --backup-start-time=03:00 --project "$PROJECT_ID"
exists gcloud sql databases describe "$DB" --instance="$SQL" --project "$PROJECT_ID" ||
  run gcloud sql databases create "$DB" --instance="$SQL" --project "$PROJECT_ID"

exists gcloud iam service-accounts describe "$SA" --project "$PROJECT_ID" ||
  run gcloud iam service-accounts create "$SA_NAME" --display-name="MoneyLog Cloud Run runtime" --project "$PROJECT_ID"
run gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:${SA}" --role="roles/cloudsql.client" --condition=None --quiet

new_secret() {  # name value - create the secret with one version, value via stdin only
  run gcloud secrets create "$1" --replication-policy=automatic --project "$PROJECT_ID"
  if [ "$DRY_RUN" != "1" ]; then printf '%s' "$2" | gcloud secrets versions add "$1" --data-file=- --project "$PROJECT_ID" >/dev/null; fi
}
if ! exists gcloud secrets describe "$S_DB" --project "$PROJECT_ID"; then
  DB_PASS="$(openssl rand -hex 24)"
  if exists sh -c "gcloud sql users list --instance='$SQL' --project='$PROJECT_ID' --format='value(name)' | grep -qx '$DB_USER'"; then
    run gcloud sql users set-password "$DB_USER" --instance="$SQL" --password="$DB_PASS" --project "$PROJECT_ID"
  else
    run gcloud sql users create "$DB_USER" --instance="$SQL" --password="$DB_PASS" --project "$PROJECT_ID"
  fi
  new_secret "$S_DB" "postgresql://${DB_USER}:${DB_PASS}@localhost/${DB}?host=/cloudsql/${CONN}&schema=public&connection_limit=3"
fi
exists gcloud secrets describe "$S_ADMIN" --project "$PROJECT_ID" || new_secret "$S_ADMIN" "$(openssl rand -base64 18 | tr -d '/+=')Aa1!"
JOB_SECRETS="DATABASE_URL=${S_DB}:latest,ADMIN_PASSWORD=${S_ADMIN}:latest"
SECRETS=("$S_DB" "$S_ADMIN")
if [ "$SEED_DEMO_DATA" = "true" ]; then
  exists gcloud secrets describe "$S_DEMO" --project "$PROJECT_ID" || new_secret "$S_DEMO" "$(openssl rand -base64 18 | tr -d '/+=')Dd1!"
  JOB_SECRETS="${JOB_SECRETS},DEMO_USER_PASSWORD=${S_DEMO}:latest"; SECRETS+=("$S_DEMO")
fi
for s in "${SECRETS[@]}"; do
  run gcloud secrets add-iam-policy-binding "$s" --member="serviceAccount:${SA}" --role="roles/secretmanager.secretAccessor" --project "$PROJECT_ID" --quiet
done

# Build in Cloud Build, tagged with the commit SHA (R-08).
CB_FILE="$(mktemp)"
cat > "$CB_FILE" <<CLOUDBUILD
steps:
- name: gcr.io/cloud-builders/docker
  args: [build, --build-arg, GIT_SHA=${SHA}, -t, ${IMAGE}, .]
images: [${IMAGE}]
CLOUDBUILD
run gcloud builds submit --project "$PROJECT_ID" --config "$CB_FILE" .

run gcloud run jobs deploy "$JOB" --image "$IMAGE" --region "$REGION" --service-account "$SA" \
  --set-cloudsql-instances "$CONN" --set-secrets "$JOB_SECRETS" \
  --set-env-vars "NODE_ENV=production,SEED_DEMO_DATA=${SEED_DEMO_DATA}" \
  --command sh --args "-c,npx prisma migrate deploy && npm run db:seed:prod" \
  --max-retries 1 --task-timeout 300s --project "$PROJECT_ID"
run gcloud run jobs execute "$JOB" --region "$REGION" --wait --project "$PROJECT_ID" || {
  echo "Migration job failed - service not updated. Logs: gcloud logging read 'resource.labels.job_name=${JOB}' --limit 50" >&2; exit 1; }

run gcloud run deploy "$SERVICE" --image "$IMAGE" --region "$REGION" --allow-unauthenticated --service-account "$SA" \
  --add-cloudsql-instances "$CONN" --set-secrets "DATABASE_URL=${S_DB}:latest" \
  --set-env-vars "NODE_ENV=production,COOKIE_SECURE=true" \
  --min-instances 0 --max-instances 2 --memory 512Mi --cpu 1 --port 3000 --project "$PROJECT_ID"

if [ "$DRY_RUN" = "1" ]; then URL="https://${SERVICE}-<hash>.${REGION}.run.app"
else URL="$(gcloud run services describe "$SERVICE" --region "$REGION" --project "$PROJECT_ID" --format='value(status.url)')"; fi
echo "Done. URL: ${URL}  (check ${URL}/api/ready and ${URL}/api/version)"
echo "Admin admin@moneylog.test: password in Secret Manager '${S_ADMIN}' (not printed)."
[ "$SEED_DEMO_DATA" = "true" ] && echo "Demo users alice/bob@moneylog.test: password in Secret Manager '${S_DEMO}' (not printed)."
exit 0
