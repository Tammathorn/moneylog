# F-14 Delivery pipeline (system responsibility)

Contract version 1.0 (2026-11-25) · Lab 5 Issues #16–#23, #33 · Delivered in Lab 5

## 1. Purpose and linked requirements

Package MoneyLog as one Docker image, test every PR, and deploy `main` to GCP automatically.
NFR-07, NFR-08, NFR-09. The design and procedure are in `docs/labs/lab-05/deployment.md`;
this file is the Sprint 2 contract summary so the feature has the same contract/AC/STS form.

## 2. Layers

| Layer | Change |
|---|---|
| UI | Footer shows `release <short SHA>` from `/api/version`. |
| API | `/api/health`, `/api/ready` (database check), `/api/version`. |
| Data | No schema change; migrations run as Cloud Run job `moneylog-migrate` before traffic moves. |
| Delivery | `Dockerfile`, `docker-compose.yml`, `.github/workflows/ci-docker.yml` (required check `test-and-docker`), `.github/workflows/deploy.yml` (WIF, image tagged with the commit SHA, deploy by digest, smoke test, rollback by `image_tag`). |

## 3. Acceptance criteria

| AC | Given / When / Then |
|---|---|
| AC-73 | No real secret is in Git; every setting is an environment variable listed in `.env.example` / `server/.env.example`, and production secrets come from Secret Manager (NFR-07). |
| AC-74 | A record created on one release is still there after a restart, a redeploy, a rollback and a roll forward (NFR-08). |
| AC-75 | A merge into `main` builds one image tagged with the commit SHA, runs migrations, deploys it to Cloud Run, and the smoke test passes only when `/api/version` returns that SHA; a PR into `main` cannot merge while `test-and-docker` fails (NFR-09). |

## 4. Verification

TEST-53 – TEST-57 (ops endpoints, seed config, footer) and the Lab 5 evidence C-01 – C-06
(release record in `deployment.md` §5). Sprint 2 re-runs AC-75 when it releases `v0.2.0`.

## Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-25 | Contract summary of the Lab 5 work for the Sprint 2 completion table. |
