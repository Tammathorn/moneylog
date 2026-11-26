# MoneyLog — Three-Sprint Plan

Version 1.0 (2026-11-14). Feature IDs: `docs/features.md`.

| Sprint | Goal | Features | Depends on | Completion outcome | Checkpoint |
|---|---|---|---|---|---|
| 1 | A signed-in user can log real money movements and immediately see correct balances, debt, income/expense and history; the admin controls who may sign in; nobody sees anyone else's money. | F-01, F-02, F-03, F-04, F-05, F-06, F-07, F-08 | — | Release `v0.1.0` on `main`: the stakeholder's Sprint 1 journey (opening bank balance → salary → split card purchase → card repayment → balances/summary/history) works through UI, API and DB; rule rejections and access restrictions are covered by automated tests. | Deliverable 1 |
| 2 | Users run their own books end to end: create/archive accounts, correct mistakes, find past records, reuse frequent transactions, track loans. The Sprint 1 release is deployed through the pipeline. | F-09, F-10, F-11, F-12, F-13, F-14 | F-14 needs the Sprint 1 release; F-10/F-12 reuse the F-05 validation module; F-13 reuses the F-03 balance engine | Release `v0.2.0` deployed to Cloud Run from `main` by CI/CD; all FR-13–FR-19 accepted by AC/tests; Lab 6 UAT defects triaged. | Deliverable 2 (29 Nov) |
| 3 | Complete and harden: reports, credential administration, performance, accessibility, rate limiting, regression. | F-15, F-16, F-17 | F-15 extends F-07 summary queries; F-16 extends F-01/F-08; F-17 covers everything | Release `v1.0.0`: every FR/BR/NFR traced to a passing test or justified manual check; defects from Labs 6–7 closed or disclosed. | Progress 29 Nov; complete 13 Dec |

## Sprint 1 scope and why it is feasible

Sprint 1 is the stakeholder's own example and nothing more. Accounts are **seeded** (AS-03);
creating them is F-09 in Sprint 2. Only one opening balance per account (no history), no edit or
delete of transactions, no filters, no pagination beyond a fixed page size, no reports.
Authentication is the TokTickIT design both students already built, so the new work is the
domain: the allocation rules (BR-01–BR-07), the balance engine and the summary (BR-08).

**Sprint 1 Issues (in order):**

| # | Issue | Branch | Features |
|---|---|---|---|
| 1 | Engineering baseline and Sprint 1 contracts | `feature/1-baseline-contracts` | all (docs) |
| 2 | Project scaffold, data model, migration, seed | `feature/2-data-model` | F-03 data, F-08 data |
| 3 | Authentication and access-control foundation | `feature/3-auth` | F-01, F-02 |
| 4 | Accounts, balances and opening balance | `feature/4-accounts` | F-03, F-04 |
| 5 | Record transaction, history and detail | `feature/5-transactions` | F-05, F-06 |
| 6 | Financial summary and admin user management | `feature/6-summary-admin` | F-07, F-08 |
| 7 | UI journey, E2E tests and release docs | `feature/7-ui-e2e` | all UI, E2E |

Flow: each feature branch from `sprint-1-staging` → PR into `sprint-1-staging` reviewed by the
teammate → integration tests on staging → release PR `sprint-1-staging` → `main` → tag
`v0.1.0`.

## Remaining work after Sprint 1

Sprint 2: FR-13–FR-19, BR-16–BR-19, NFR-07–NFR-09 (with Lab 5). Sprint 3: FR-20–FR-22,
NFR-10–NFR-12 verification, Q-01 resolution, defects from Labs 6–7.

## Sprint 2 Issues (added 2026-11-25)

Sprint 2 uses the Lab 5 branch flow: feature branch from `staging` → PR into `staging` reviewed by
the teammate → release PR `staging` → `main` (ruleset) → automatic deploy → tag `v0.2.0`.

| # | Issue | Branch | Features | Contract |
|---|---|---|---|---|
| 39 | Sprint 2 contracts, STS and DoD | `feature/39-sprint-2-contracts` | F-09–F-14 (docs) | `docs/sprints/sprint-2/` |
| 40 | Account management | `feature/40-account-management` | F-09 | `F-09-account-management.md` |
| 41 | Transaction correction, favourites, Duplicate | `feature/41-correction-favourites` | F-10, F-12 | `F-10-F-12-correction-favourites.md` |
| 42 | History search, filter, pagination | `feature/42-history-filter` | F-11 | `F-11-history-filter.md` |
| 43 | Loan overview | `feature/43-loan-overview` | F-13 | `F-13-loan-overview.md` |
| 16–23, 33 | Lab 5 delivery pipeline (done) | Lab 5 branches | F-14 | `F-14-delivery-pipeline.md` |
| 44 | Sprint 3 contracts + change own password | `feature/44-sprint-3` | F-15–F-17 (docs), F-16 FR-22 | `docs/sprints/sprint-3/` |

## Sprint 3 plan (added 2026-11-26)

Sprint 3 runs 2026-11-26 – 2026-12-13 around the examination period (1–11 December): product code first,
December only for verification, defects, UAT re-tests and the video. Contracts: `docs/sprints/sprint-3/`.

| # | Issue | Feature / AC | Owner | Depends on | Code by | Verified by | Status (2026-11-26) |
|---|---|---|---|---|---|---|---|
| 44 | Sprint 3 contracts + change own password | F-16 FR-22, AC-76 – AC-80 | Tammathorn | F-01 | 2026-11-26 | 2026-11-26 | Implemented + tested (PR #50) |
| 53 | Admin creates user with temporary password | F-16 FR-21, AC-81 | Tammathorn | #44 | 2026-11-30 | 2026-12-12 | Planned |
| 54 | Monthly reports | F-15 FR-20, AC-82 – AC-85 | Chakriwat | F-07, F-11 | 2026-11-30 | 2026-12-12 | Planned |
| 55 | Sign-in rate limit | F-17 NFR-12, AC-86 | Tammathorn | — | 2026-11-30 | 2026-12-12 | Planned |
| 56 | Performance smoke | F-17 NFR-10, AC-87 | Chakriwat | F-11 | — | 2026-12-12 | Planned |
| 57 | Responsive and accessibility pass | F-17 NFR-11, AC-88 | Tammathorn | all screens | — | 2026-12-12 | Planned |
| 58 | Lab 6 UAT findings (Pakato): triage, RED/GREEN fixes, re-test | DEF-xx | Chakriwat (+ Tammathorn) | Pakato sessions | 2026-11-30 | 2026-12-12 | Waiting for findings |
| 59 | Final release `v1.0.0`, regression, video | AC-89 | Tammathorn | all above | — | 2026-12-13 | Planned |

Milestones: 2026-11-29 release `v0.2.0` (Sprint 2 + FR-22) and D2 · 2026-11-30 remaining Sprint 3 code on
branches · 2026-12-12 verification, UAT re-tests, video · 2026-12-13 `v1.0.0` deployed and tagged.
