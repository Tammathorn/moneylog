# MoneyLog — Change and Defect Register

Version 1.0 (2026-11-26). One row per deployment, UAT, maintenance or review finding and per
approved baseline revision since the Sprint 1 release (`v0.1.0` = `088148a`, 2026-11-15).
Status values: **Resolved** (fixed and re-tested), **Accepted** (approved change, in effect),
**Open** (not yet resolved), **Pending** (finding not yet received).

## 1. Findings (deployment, UAT, maintenance)

| ID | Source | Affected req./feature | Finding | Decision | Status | Fix / change release | Re-test outcome |
|---|---|---|---|---|---|---|---|
| CR-01 | Lab 5 deployment (Docker build) | NFR-09, F-14 | The Alpine runtime image had no OpenSSL, so the Prisma engine could not start. | Install `openssl` in the builder and runtime stages. | Resolved | PR #25, first deploy `437026b` | Container starts; `/api/ready` = db connected (C-03, Lab 5 Fig. 9) |
| CR-02 | Lab 5 deployment (Cloud Run) | NFR-01, AC-12, F-02 | Behind the Cloud Run proxy the browser's Origin is the service URL, which was not the configured `CLIENT_ORIGIN`, so the Origin check would refuse the app's own writes. | Accept the server's own origin from `X-Forwarded-Host/Proto` in addition to `CLIENT_ORIGIN`; foreign origins still 403. | Resolved | PR #24, release A `af6efa2` | TEST-14 (foreign origin 403) passes; sign-in and saving work on the live URL (Lab 5 C-04) |
| CR-03 | Lab 5 deployment (seed) | NFR-07, F-14 | The seed ran with a dev-only tool and one shared demo password variable, unsuitable for the production image and Secret Manager. | Compiled seed entry (`db:seed:prod`); `ADMIN_PASSWORD`, `SEED_DEMO_DATA`, `DEMO_USER_PASSWORD` (≥ 12 chars) from Secret Manager. | Resolved | PR #24, release A | TEST-56 (seed config); migrate job seeds on Cloud Run |
| CR-04 | Lab 5 review (process) | NFR-09, DoD 4 | Release PR #28 was merged into `main` before the protection ruleset existed, so it had no prior approval. | Ruleset `protect-main` (PR + 1 approval + `test-and-docker`, no bypass); later releases approved first. | Resolved | Ruleset 27812118 (2026-11-21) | PR #32, #35 approved before merge; PR #36 blocked by failing check (Lab 5 C-02) |
| CR-05 | Lab 5 deployment (release proof) | NFR-09 | Image digest shown by Cloud Run (platform manifest) differs from the tag's index digest; easy to misread as a wrong image. | Deploy by digest; smoke test checks `/api/version` = commit SHA; note in `deployment.md` §5. | Accepted | `deployment.md` (PR #34) | Every Deploy demo run passes the SHA check |
| CR-06 | Lab 5 review (teammate) | F-14 (UI) | Footer should show which release is running. | Footer "release <short SHA>" from `/api/version`. | Accepted | PR #31, release B `161420e` | TEST-57; live footer shows the SHA |
| CR-07 | Maintenance (Dependabot) | Tooling | PR #29 proposes `actions/upload-artifact` 4.6.2 → 7.0.2 (major jump). | Deferred until after the final release to avoid a CI change during the checkpoint. | Open | — | Planned re-test with CI before merge (owner: Chakriwat, by 2026-12-12) |
| CR-08 | Sprint 2 testing (E2E) | TEST-80 | One full E2E run failed once: the test counted history before the duplicate save had finished. | Test defect: wait for the "Transaction saved" page before counting. Product unchanged. | Resolved | PR #48 (`aeb3a93`) | 4 consecutive full E2E runs passed |
| CR-09 | Lab 6 UAT (partner team tests MoneyLog) | F-01 – F-08 | UAT plan and handoff ready (`docs/labs/lab-06/uat-plan.md`, PR #38); findings not yet received. | Each finding will be added here as DEF-xx with classification. | Pending | — | — |
| CR-10 | Lab 7 | — | Lab 7 has not taken place yet. | Findings will be added when received. | Pending | — | — |

## 2. Approved baseline revisions

| ID | Document | Change | Rationale | Approved |
|---|---|---|---|---|
| BL-01 | SRS FR-13 | Subtype rule explicit (required for Cash/Loan Taken, optional for Loan Given, none for Income/Expense). | Needed to write testable AC-44. | SRS 2.0, PR #45/#51 review |
| BL-02 | SRS BR-06 | Own archived account → `ACCOUNT_ARCHIVED`; correction may keep archived accounts already on the transaction (D-12). | Clear user message; old records stay correctable. | SRS 2.0 |
| BL-03 | SRS BR-17 | Type locked also once an opening balance is set (D-14). | An opening balance means different things per type. | SRS 2.0 |
| BL-04 | SRS decisions | D-13 unique names (case-insensitive, archived included), D-15 hard delete with confirmation, D-16 resolves Q-01, D-17 password change ends other sessions. | Decisions taken while writing Sprint 2/3 contracts. | SRS 2.0 |
| BL-05 | Feature inventory | F-09 wording includes restore and delete-if-unused. | Wording only. | features 2.0 |
| BL-06 | API contract | `AccountDTO.inUse`, `TransactionDTO.isFavourite`, `updatedAt` added; TEST-16 expectation updated accordingly. | Additive fields required by F-09/F-10/F-12 contracts. | F-09/F-10 contracts 1.0 |

No requirement was removed, and no Sprint 2 feature was moved to Sprint 3.
