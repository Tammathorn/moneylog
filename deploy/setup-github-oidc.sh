#!/usr/bin/env bash
# MoneyLog - one-time GitHub -> GCP trust for deploy.yml (Lab 5 #6), run in Cloud Shell:
#   DRY_RUN=1 PROJECT_ID=<id> bash deploy/setup-github-oidc.sh   # print the plan
#   PROJECT_ID=<id> bash deploy/setup-github-oidc.sh             # apply
# Keyless: Workload Identity Federation, no service-account key is ever created.
# Only GitHub Actions runs of THIS repository (by numeric id), on main, in the
# `demo` environment, from workflow deploy.yml can impersonate the deployer.
set -euo pipefail
DRY_RUN="${DRY_RUN:-0}"; REGION="${REGION:-asia-southeast1}"
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
[ -n "$PROJECT_ID" ] || { echo "Set PROJECT_ID" >&2; exit 1; }
REPO="Tammathorn/moneylog"; REPO_ID=1458228292; OWNER_ID=152457560   # from the GitHub API
POOL=github-actions; PROVIDER=github-main
DEPLOYER=moneylog-deployer; DEPLOYER_SA="${DEPLOYER}@${PROJECT_ID}.iam.gserviceaccount.com"
RUNNER_SA="moneylog-runner@${PROJECT_ID}.iam.gserviceaccount.com"

run() { if [ "$DRY_RUN" = "1" ]; then printf '[DRY_RUN] '; else printf '+ '; fi; printf '%q ' "$@"; printf '\n'; [ "$DRY_RUN" = "1" ] || "$@"; }
exists() { [ "$DRY_RUN" != "1" ] && "$@" >/dev/null 2>&1; }

if [ "$DRY_RUN" = "1" ]; then NUM=123456789012; else NUM="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"; fi
run gcloud services enable iamcredentials.googleapis.com sts.googleapis.com --project "$PROJECT_ID"

exists gcloud iam service-accounts describe "$DEPLOYER_SA" --project "$PROJECT_ID" ||
  run gcloud iam service-accounts create "$DEPLOYER" --display-name="MoneyLog GitHub deployer" --project "$PROJECT_ID"
# Least privilege: update Cloud Run service/job, push images to one repository,
# act as the runtime account only. No Secret Manager, IAM admin or Cloud SQL rights.
run gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:${DEPLOYER_SA}" --role=roles/run.developer --condition=None --quiet
run gcloud artifacts repositories add-iam-policy-binding moneylog --location "$REGION" --member="serviceAccount:${DEPLOYER_SA}" --role=roles/artifactregistry.writer --project "$PROJECT_ID" --quiet
run gcloud iam service-accounts add-iam-policy-binding "$RUNNER_SA" --member="serviceAccount:${DEPLOYER_SA}" --role=roles/iam.serviceAccountUser --project "$PROJECT_ID" --quiet

exists gcloud iam workload-identity-pools describe "$POOL" --location=global --project "$PROJECT_ID" ||
  run gcloud iam workload-identity-pools create "$POOL" --location=global --display-name="GitHub Actions" --project "$PROJECT_ID"
CONDITION="assertion.repository_id=='${REPO_ID}' && assertion.repository_owner_id=='${OWNER_ID}' && assertion.ref=='refs/heads/main' && assertion.environment=='demo' && assertion.workflow_ref.startsWith('${REPO}/.github/workflows/deploy.yml@')"
MAPPING="google.subject=assertion.repository_id+':'+assertion.ref+':'+assertion.environment,attribute.repository_id=assertion.repository_id,attribute.ref=assertion.ref,attribute.environment=assertion.environment"
exists gcloud iam workload-identity-pools providers describe "$PROVIDER" --workload-identity-pool="$POOL" --location=global --project "$PROJECT_ID" ||
  run gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" --workload-identity-pool="$POOL" --location=global \
    --issuer-uri="https://token.actions.githubusercontent.com" --attribute-mapping="$MAPPING" --attribute-condition="$CONDITION" --project "$PROJECT_ID"
run gcloud iam service-accounts add-iam-policy-binding "$DEPLOYER_SA" --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/${NUM}/locations/global/workloadIdentityPools/${POOL}/attribute.repository_id/${REPO_ID}" --project "$PROJECT_ID" --quiet

echo
echo "GitHub > Settings > Environments > demo (deployment branch: main only) - variables:"
echo "  GCP_PROJECT_ID      = ${PROJECT_ID}"
echo "  GCP_REGION          = ${REGION}"
echo "  WIF_PROVIDER        = projects/${NUM}/locations/global/workloadIdentityPools/${POOL}/providers/${PROVIDER}"
echo "  WIF_SERVICE_ACCOUNT = ${DEPLOYER_SA}"
