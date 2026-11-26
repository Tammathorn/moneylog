# MoneyLog — Lab 6 Report: Independent UAT and Defect Management (DRAFT)

Status: **DRAFT 2026-11-26.** Sections marked ⏳ are filled during and after the UAT sessions with team
Pakato. Nothing below is claimed as done until it has happened. Deadline: 29 November 2026 (extended).

## 0. Identification

| Item | Value |
|---|---|
| Our team (Product Team for MoneyLog; UAT Team for Pakato) | Tammathorn Kananurak (67070503489, @Tammathorn) · Chakriwat Srivilai (67070503407, @GusGusxz) |
| Partner team (UAT Team for MoneyLog; Product Team for their app) | **Pakato** — ⏳ names, student IDs, theme, repository and deployed URL |
| Our theme / context | 7. Personal Money and Expense Logging System (multi-user THB money logging; admin controls sign-in only) |
| Sprint 1 scope under test | F-01 – F-08 (sign-in/out, access control, accounts and balances, opening balance, record transaction, history/detail, summary, admin enable/disable); AC-01 – AC-42 |
| Repository | https://github.com/Tammathorn/moneylog |
| Sprint 1 baseline | Tag `v0.1.0` = `088148a` |
| Deployed version under test | `main` @ `d0a1304`, Cloud Run revision `moneylog-00006-6qc`, https://moneylog-73939023981.asia-southeast1.run.app (only Lab 5 operations changes since `v0.1.0`; no Sprint 1 rule, screen or API changed) |
| Final UAT decision | ⏳ recorded by Pakato in Part D |

### Version table

| Role | Version | Note |
|---|---|---|
| Sprint 1 baseline | `v0.1.0` / `088148a` | Accepted Deliverable 1 release |
| Tested deployment | `d0a1304` / `moneylog-00006-6qc` | Lab 5 release C: adds health/version endpoints, footer, production seed, proxy-aware Origin check |
| Defective commit(s) | ⏳ none known | Filled if Pakato reports an accepted defect |
| Test change (RED) | ⏳ | |
| Corrected `main` release | ⏳ | |
| Corrected deployed revision | ⏳ | |

The Sprint 2 release (`v0.2.0`) is **not** deployed until Pakato finishes the UAT sessions, or only after telling them first (Lab 6 §2 coordination).

## Part A — UAT preparation and handoff (our product)

The complete, executable plan is `docs/labs/lab-06/uat-plan.md` (included in full in Appendix A).
Summary:

| Case | Category | Sprint 1 refs | Role | Purpose |
|---|---|---|---|---|
| UAT-01 | Normal domain journey | FR-06 – FR-08, FR-10; AC-21 – AC-24, AC-35 | U1 alice | Salary, split card purchase, card repayment; balances and summary calculated explicitly (KBank +24,000.00, card +850.00, net +23,150.00) |
| UAT-02 | Business rule / boundary | BR-01, BR-04; AC-25, AC-28, AC-31 | U1 | Lines must equal the total to the satang; 3 decimals refused; nothing saved |
| UAT-03 | Business rule / boundary | FR-05, BR-06, BR-09; AC-18, AC-19 | U2 bob | Opening balance on cash; none on income/expense |
| UAT-04 | Forbidden role / ownership | BR-20, BR-21, NFR-01; AC-09 – AC-11, AC-29, AC-33 | U1, U2, A1 | Another user's transaction (UI and API), admin denied financial data, user denied admin |
| UAT-05 | State / history / persistence | FR-09, FR-10, NFR-08; AC-32 – AC-34, AC-36 | U1 | Records and balances retrieved after sign-out and a new session; date range |
| UAT-06 | Forbidden role / state | FR-11, FR-12, BR-22, BR-23; AC-38, AC-39, AC-42 | A1, U2 | Disable ends the session and blocks sign-in; enable restores |
| UAT-07 | Forbidden / boundary | FR-01, BR-23, BR-24; AC-02, AC-08 | — | Same sign-in error for wrong password, unknown e-mail and disabled user |

Safe accounts (passwords given privately): U1 `alice@moneylog.test`, U2 `bob@moneylog.test`, U3 `dave@moneylog.test`
(disabled on purpose), A1 `admin@moneylog.test`. Data: synthetic; expected balances written as "value before + change"
so cases can be re-run; run order UAT-01 → UAT-02 → UAT-05, others independent; cleanup: re-enable bob if UAT-06 stops early.

Handoff record ⏳: date sent to Pakato, channel, who sent it, how credentials were shared (privately, not in Git/PDF).

## Part B — Independent execution of Pakato's Sprint 1 cases (we are the UAT Team) ⏳

| Item | Value |
|---|---|
| Product under test | ⏳ Pakato's app name / theme |
| Release tag/commit and deployed revision | ⏳ (from their handoff) |
| URL | ⏳ |
| Testers | Tammathorn Kananurak, Chakriwat Srivilai (both execute; pair work noted per case) |

Execution log (fill one row per case; do not copy expected results into "Actual"):

| Case ID | Category | Tester | Date / time (ICT) | Tested version | Inputs used | Actual result (observed) | PASS / FAIL / BLOCKED | Evidence ID |
|---|---|---|---|---|---|---|---|---|
| ⏳ | Normal journey | | | | | | | B-E01 |
| ⏳ | Business rule / boundary | | | | | | | B-E02 |
| ⏳ | Forbidden role / ownership | | | | | | | B-E03 |
| ⏳ | State / history / persistence | | | | | | | B-E04 |

Evidence rules: each screenshot gets an ID, action, expected/actual, time and the tested version; for a rejected
operation also show that the protected data was not changed or disclosed (e.g. reload as the owner).

## Part C — Defect reporting and triage ⏳

### C.1 Outgoing reports (our findings on Pakato's product)

| Report ID | Product team | Reporter | Tested version | Case / requirement | Preconditions / data | Steps | Expected | Actual | Severity (user impact) | Defect or enhancement | Evidence | Partner response |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ⏳ | Pakato | | | | | | | | | | | |

### C.2 Received findings (Pakato's findings on MoneyLog)

GitHub label `uat` in our repository. Classification: accepted defect / duplicate / not-defect / enhancement,
with a reason tied to the Sprint 1 contract (AC) and evidence. Critical and major block acceptance.

| Finding | Reporter | Case / AC | Summary | Classification and reason | Severity | Owner | Fix status | Disposition |
|---|---|---|---|---|---|---|---|---|
| ⏳ (record "none received" if none) | | | | | | | | |

## Part D — Resolution and independent re-test ⏳

For each accepted defect: Issue → regression test that fails on the defective code (RED, command + commit + output)
→ fix on `feature/<n>-…` from `staging` → teammate-reviewed PR + CI → reviewed release to `main` → automatic
deploy → smoke check → Pakato re-tests the original case and records the result.

| Defect | Issue | RED commit / output | GREEN commit / output | Fix PR (reviewer) | Release / revision | Pakato re-test (tester, version, result) |
|---|---|---|---|---|---|---|
| ⏳ | | | | | | |

**If no legitimate defect is found (Lab 6 §3.5):** we ask the instructor/TA for a controlled defect exercise on an
isolated branch (not the live release) and apply the same report → triage → RED → GREEN → review → release →
re-test chain there. Request sent: ⏳ (date, channel, evidence).

### Final Sprint 1 UAT decision (recorded by the UAT Team, Pakato)

| Decision | Tested release | Testers | Date | Conditions / accepted minor limitations |
|---|---|---|---|---|
| ⏳ Accepted / Accepted with minor limitations / Not Accepted | `d0a1304` (or the corrected release) | ⏳ Pakato members | ⏳ | ⏳ |

## Contributions, AI use and limitations

| Work | Tammathorn | Chakriwat |
|---|---|---|
| UAT plan and handoff (Part A) | Wrote cases with AI assistance; checked expected UI text against the code | ⏳ review of PR #38 |
| Executing Pakato's cases (Part B) | ⏳ | ⏳ |
| Triage and fixes (Parts C–D) | ⏳ | ⏳ |

AI use: Claude (Anthropic) drafted the UAT cases, this report structure and code changes under the students'
direction; every expected result was checked against the Sprint 1 contracts and the running code, and all
execution, triage decisions and acceptance are made by people. Limitations: ⏳.

## Appendix A — MoneyLog Sprint 1 UAT plan (complete)

See `docs/labs/lab-06/uat-plan.md` (embedded in the PDF build).
