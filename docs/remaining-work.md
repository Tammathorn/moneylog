# MoneyLog — Remaining work and completion plan (to 13 December 2026)

Version 1.0 (2026-11-26). Final examinations run 1–11 December, so the plan keeps the product work
before 30 November and uses December only for bounded completion, defects, verification and the
video. Owners: **TK** = Tammathorn Kananurak, **CS** = Chakriwat Srivilai.

## 1. Feature and defect status

| Feature or defect | Current status | Remaining action | Depends on | Owner and target |
|---|---|---|---|---|
| F-09 – F-13 | Implemented; AC-43 – AC-72 tested and passing on PRs #46 – #49 | Teammate review and merge into `staging`; release `v0.2.0` to `main`; TEST-93 on the deployed candidate | CS review | CS review by 2026-11-28; TK release by 2026-11-29 |
| F-16 FR-22 change own password | Implemented; AC-76 – AC-80 tested (TEST-94 – TEST-98) | Merge with `v0.2.0` | PR #50 review | CS by 2026-11-28 |
| F-16 FR-21 admin creates user (#53) | Contract (AC-81) written; not implemented | Migration `mustChangePassword`, `POST /api/admin/users`, forced change at first sign-in, tests | FR-22 (done) | TK, implemented 2026-11-30; tested 2026-12-12 |
| F-15 Monthly reports (#54) | Contract (AC-82 – AC-85) written; not implemented | `monthlyReport()` + API + Reports page + tests | F-07, F-11 | CS, 2026-11-30 (code) / 2026-12-12 (verification) |
| F-17 NFR-12 rate limit (#55) | Contract (AC-86) written; not implemented | Sliding-window limiter on login + API test with fake clock | — | TK, 2026-11-30 |
| F-17 NFR-10 performance (#56) | Contract (AC-87); design index exists | Seed 2,000 transactions; `perf_smoke.py`; record p95 local and Cloud Run | F-11 | CS, 2026-12-12 |
| F-17 NFR-11 responsive/accessible (#57) | Contract (AC-88) | Playwright at 390/834/1280 px, axe check, keyboard run of the journey | all screens | TK, 2026-12-12 |
| CR-07 Dependabot PR #29 | Open (deferred) | Merge only with green CI after the final release candidate | — | CS, 2026-12-12 |
| CR-09 Lab 6 UAT findings (#58) | Pending (partner team testing) | Triage each finding as DEF-xx, fix with red/green test, re-test with partner | Partner team | TK + CS, fixes by 2026-11-30, re-test by 2026-12-12 |
| CR-10 Lab 7 findings | Pending | Same process as CR-09 | Lab 7 | TK + CS, by 2026-12-12 |

## 2. Dated plan

| Date | Milestone |
|---|---|
| 2026-11-28 | All Sprint 2/3-progress PRs reviewed and merged into `staging`; Lab 6 partner UAT finished on the Sprint 1 deployment |
| 2026-11-29 | Release `v0.2.0` to `main` (ruleset), automatic deploy, TEST-93 post-deploy journey and persistence check, D2 PDF submitted |
| 2026-11-30 | Remaining Sprint 3 code (FR-21, F-15, NFR-12) on feature branches with tests; Lab 6 defects fixed |
| 2026-12-01 – 12-11 | Examinations: only reviews, CI fixes and small defects |
| 2026-12-12 | NFR-10/NFR-11 verification, UAT re-tests, regression on the release candidate, final video recorded |
| 2026-12-13 | Final release `v1.0.0` on `main`, deployed and tagged; final documentation |

## 3. Readiness review (2026-11-26)

- **Ready:** Sprint 1 slice (regression green), all Sprint 2 features with contracts, TDD and passing
  tests, one Sprint 3 workflow (FR-22), delivery pipeline with ruleset, deploy-by-SHA and rollback.
- **Risk:** reviews and the release depend on both students being available before 29 November;
  mitigation: PRs are small and stacked in merge order, each with CI green.
- **Risk:** the Lab 6 window and the `v0.2.0` deploy share the same URL; mitigation: deploy only after
  the partner team finishes or after telling them (DoD 7).
- **Not ready:** FR-21, F-15, NFR-10/11/12 (planned above, contracts in place).
