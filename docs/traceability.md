# MoneyLog — Requirements Traceability

Version 2.0 (2026-11-26). One matrix for every baseline FR, BR and NFR, including the approved
revisions of SRS 2.0 (marked *rev.*). Columns: requirement → feature/responsibility → sprint → AC or
NFR verification → planned test → actual test file → result and version. "Pass" means executed
and passed on the stated version; "Planned" means not yet run. Test files are under
`server/tests/`, `client/tests/` and `e2e/`.

## 1. Requirement matrix

| Requirement | Feature / responsibility | Sprint | AC / NFR verification | Planned test | Actual test file | Result and version |
|---|---|---|---|---|---|---|
| FR-01 | F-01 Sign-in | 1 | AC-01, AC-08 | TEST-01, TEST-09, TEST-10 | auth.api.test.ts, e2e/access.spec.ts | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| FR-02 | F-01 Sign-out | 1 | AC-05 | TEST-05, TEST-50 | auth.api.test.ts, e2e/journey.spec.ts | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| FR-03 | F-01 Current user | 1 | AC-04 | TEST-04 | auth.api.test.ts | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| FR-04 | F-03 Accounts and balances | 1 | AC-14, AC-17 | TEST-16, TEST-20 | accounts.api.test.ts, Accounts.test.tsx | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| FR-05 | F-04 Opening balance | 1 | AC-18 | TEST-21 | accounts.api.test.ts | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| FR-06 | F-05 Payment | 1 | AC-21 – AC-23 | TEST-24 – TEST-26 | transactions.api.test.ts | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| FR-07 | F-05 Money received | 1 | AC-24 | TEST-27 | transactions.api.test.ts | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| FR-08 | F-03 engine + F-05 | 1 | AC-15, AC-21 – AC-24 | TEST-17, TEST-24 – TEST-27, TEST-50 | balances.test.ts, transactions.api.test.ts, journey.spec.ts | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| FR-09 | F-06 History and detail | 1 | AC-32 – AC-34 | TEST-38 – TEST-40 | transactions.api.test.ts, History.test.tsx | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| FR-10 | F-07 Summary | 1 | AC-35, AC-36 | TEST-41 – TEST-43, TEST-50 | summary.test.ts, summary.api.test.ts | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| FR-11 | F-08 User list | 1 | AC-38 | TEST-45 | admin.api.test.ts | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| FR-12 | F-08 Enable/disable | 1 | AC-39, AC-42 | TEST-46, TEST-49 | admin.api.test.ts, AdminUsers.test.tsx | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| FR-13 | F-09 Create account | 2 | AC-43 – AC-45 | TEST-60 – TEST-63 | account-rules.test.ts, account-management.api.test.ts | Pass — `ffeead5` (local) + CI on PR |
| FR-14 | F-09 Rename/archive | 2 | AC-46, AC-47, AC-50 | TEST-63, TEST-64, TEST-67, TEST-99 | account-management.api.test.ts, Accounts.test.tsx, NewTransaction.test.tsx | Pass — `ffeead5` (local) + CI on PR |
| FR-15 | F-10 Correction | 2 | AC-51 – AC-57 | TEST-68 – TEST-74, TEST-77, TEST-80 | transaction-correction.api.test.ts, TransactionDetail.test.tsx, e2e/sprint2-correction.spec.ts | Pass — `ffeead5` (local) + CI on PR |
| FR-16 | F-11 Search and filter | 2 | AC-58 – AC-62 | TEST-81 – TEST-86 | history-filter.test.ts, history-filter.api.test.ts, History.test.tsx | Pass — `ffeead5` (local) + CI on PR |
| FR-17 | F-12 Favourites | 2 | AC-63, AC-64, AC-67 | TEST-75, TEST-76, TEST-79 | favourites.api.test.ts, TransactionDetail.test.tsx | Pass — `ffeead5` (local) + CI on PR |
| FR-18 | F-12 Duplicate | 2 | AC-65, AC-66 | TEST-78, TEST-80 | TransactionDetail.test.tsx, e2e/sprint2-correction.spec.ts | Pass — `ffeead5` (local) + CI on PR |
| FR-19 | F-13 Loan overview | 2 | AC-68 – AC-72 | TEST-87 – TEST-91 | loans.test.ts, loans.api.test.ts, Loans.test.tsx | Pass — `ffeead5` (local) + CI on PR |
| FR-20 | F-15 Monthly reports | 3 | AC-82 – AC-85 | planned | — | Planned (D3) — not run |
| FR-21 | F-16 Admin creates user | 3 | AC-81 | planned | — | Planned (D3) — not run |
| FR-22 | F-16 Change own password | 3 | AC-76 – AC-80 | TEST-94 – TEST-98, TEST-100 | password-policy.test.ts, password.api.test.ts, ChangePassword.test.tsx, e2e/sprint3-demo.spec.ts | Pass — `ffeead5` (local) + CI on PR |
| BR-01 | F-05 Allocation = total | 1 (+2 edit) | AC-25, AC-52 | TEST-28, TEST-29, TEST-51, TEST-70 | transaction-rules.test.ts, transactions.api.test.ts, rules.spec.ts, transaction-correction.api.test.ts | Pass — `v0.1.0` (D1) and regression at `ffeead5`; edit: Pass — `ffeead5` (local) + CI on PR |
| BR-02 | F-05 Amount limits | 1 | AC-28, AC-52 | TEST-33, TEST-34, TEST-70 | transaction-input.test.ts, transaction-correction.api.test.ts | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| BR-03 | F-05 Header type | 1 | AC-26 | TEST-30, TEST-31 | transaction-rules.test.ts | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| BR-04 | F-05 Line types | 1 | AC-26, AC-52 | TEST-30, TEST-31, TEST-70 | transaction-rules.test.ts | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| BR-05 | F-05 No self/duplicate line | 1 | AC-27 | TEST-32 | transaction-rules.test.ts | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| BR-06 | F-04/F-05 Own active accounts (rev. 2.0) | 1 / 2 | AC-20, AC-29, AC-47, AC-53 | TEST-23, TEST-35, TEST-64, TEST-68, TEST-71 | accounts.api.test.ts, account-management.api.test.ts, transaction-correction.api.test.ts | Pass — `v0.1.0` (D1) and regression at `ffeead5`; rev.: Pass — `ffeead5` (local) + CI on PR |
| BR-07 | F-03 Balance engine | 1 | AC-15, AC-68 | TEST-17, TEST-24 – TEST-27, TEST-87 | balances.test.ts, loans.test.ts | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| BR-08 | F-07 Income/expense only | 1 | AC-23, AC-35 | TEST-26, TEST-41, TEST-42 | summary.test.ts | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| BR-09 | F-04 Opening rules | 1 | AC-19 | TEST-22 | accounts.api.test.ts | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| BR-09 *rev. 3.0* | F-04 Opening rules (Lab 7, #64) | 1 (maint.) | AC-90, AC-91, AC-19 rev. 2 | TEST-101 – TEST-104, TEST-22 | accounts.api.test.ts, client/tests/Accounts.test.tsx | Planned (Lab 7) — not run |
| BR-10 | F-05 Date range | 1 | AC-28 | TEST-33, TEST-34 | transaction-input.test.ts | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| BR-11 | F-05 Text limits | 1 | AC-28 | TEST-33 | transaction-input.test.ts | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| BR-12 | F-05/F-10 Atomic save/edit | 1 / 2 | AC-25, AC-30, AC-56 | TEST-29, TEST-36, TEST-74 | transactions.api.test.ts, transaction-correction.api.test.ts | Pass — `v0.1.0` (D1) and regression at `ffeead5`; edit: Pass — `ffeead5` (local) + CI on PR |
| BR-13 | F-03 Derived balances | 1 | AC-16, AC-54 | TEST-19, TEST-72 | balances.test.ts, transaction-correction.api.test.ts | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| BR-14 | F-03 Negative cash flagged | 1 | AC-17 | TEST-20 | Accounts.test.tsx | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| BR-15 | F-06 History order | 1 | AC-32, AC-58 | TEST-38, TEST-82 | transactions.api.test.ts, history-filter.api.test.ts | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| BR-16 | F-09 Archived accounts | 2 | AC-47, AC-50, AC-53, AC-71 | TEST-64, TEST-67, TEST-71, TEST-90 | account-management.api.test.ts, NewTransaction.test.tsx, loans.api.test.ts | Pass — `ffeead5` (local) + CI on PR |
| BR-17 | F-09 Delete/type limits (rev. 2.0) | 2 | AC-48, AC-49 | TEST-65, TEST-66 | account-management.api.test.ts | Pass — `ffeead5` (local) + CI on PR |
| BR-18 | F-12 Duplicate not auto-saved | 2 | AC-65, AC-66 | TEST-78, TEST-80 | TransactionDetail.test.tsx, sprint2-correction.spec.ts | Pass — `ffeead5` (local) + CI on PR |
| BR-19 | F-12 Favourite privacy | 2 | AC-55, AC-63, AC-64 | TEST-73, TEST-75, TEST-76 | favourites.api.test.ts | Pass — `ffeead5` (local) + CI on PR |
| BR-20 | F-02/F-08 Admin no financial access | 1 / 2 | AC-10, AC-38, AC-70 | TEST-12, TEST-45, TEST-52, TEST-89, TEST-92 | access.api.test.ts, loans.api.test.ts | Pass — `v0.1.0` (D1) and regression at `ffeead5`; new routes: Pass — `ffeead5` (local) + CI on PR |
| BR-21 | F-02 Owner-only records | 1 / 2 | AC-14, AC-29, AC-33, AC-37, AC-46, AC-48, AC-55, AC-60, AC-70 | TEST-16, TEST-35, TEST-39, TEST-44, TEST-63, TEST-65, TEST-73, TEST-84, TEST-89 | api tests listed | Pass — `v0.1.0` (D1) and regression at `ffeead5`; new routes: Pass — `ffeead5` (local) + CI on PR |
| BR-22 | F-08 No self-disable | 1 | AC-40 | TEST-47 | admin.api.test.ts | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| BR-23 | F-01/F-08 Disabled loses access | 1 | AC-02, AC-39 | TEST-02, TEST-46 | auth.api.test.ts, admin.api.test.ts | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| BR-24 | F-01 Uniform failure | 1 | AC-02 | TEST-02 | auth.api.test.ts | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| NFR-01 | F-02 Unauthenticated rejection | 1 / 2 | AC-09 | TEST-11, TEST-92 | access.api.test.ts | Pass — `v0.1.0` (D1) and regression at `ffeead5`; new routes: Pass — `ffeead5` (local) + CI on PR |
| NFR-02 | F-01/F-16 Password hashing | 1 / 3 | AC-07, AC-76 | TEST-07, TEST-08, TEST-95 | password.test.ts, password.api.test.ts | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| NFR-03 | F-01 Sessions | 1 / 3 | AC-01, AC-05, AC-06, AC-76 | TEST-01, TEST-05, TEST-06, TEST-95 | auth.api.test.ts, password.api.test.ts | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| NFR-04 | F-03 Exact money | 1 | AC-16 | TEST-18, TEST-19 | money.test.ts, balances.test.ts | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| NFR-05 | F-05/F-10 Atomicity | 1 / 2 | AC-25, AC-30, AC-56 | TEST-29, TEST-36, TEST-74 | transactions.api.test.ts, transaction-correction.api.test.ts | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| NFR-06 | F-02 Safe errors | 1 | AC-13 | TEST-15 | http-error.test.ts | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| NFR-07 | F-14 Secrets/config | 2 | AC-73 | Lab 5 checks | `.env.example`, Secret Manager, Lab 5 Part 2 | Pass — Lab 5 |
| NFR-08 | F-14 Durable storage | 2 | AC-74 | Lab 5 C-05; TEST-93 | deployment.md §5 release record | Pass — Lab 5; re-run at `v0.2.0` |
| NFR-09 | F-14 Docker + GCP pipeline | 2 | AC-75 | Lab 5 C-01–C-06; TEST-93 | ci-docker.yml, deploy.yml, smoke_test.py | Pass — Lab 5; re-run at `v0.2.0` |
| NFR-10 | F-17 Performance | 3 | AC-87 | perf smoke | — | Planned (D3) — not run (design: index userId,date) |
| NFR-11 | F-17 Responsive/accessible | 3 | AC-88 | Playwright widths + axe | — | Planned (D3) — not run (design tokens, labels in place) |
| NFR-12 | F-17 Sign-in rate limit | 3 | AC-86 | API test | — | Planned (D3) — not run |

## 2. Coverage gaps and planned final verification

| Gap | Requirement | Why open | Planned verification | Owner / date |
|---|---|---|---|---|
| Not implemented | FR-20 (F-15) | Sprint 3 | AC-82 – AC-85: unit `monthlyReport()`, API vs summary, UI table | CS / 2026-12-12 |
| Not implemented | FR-21 (F-16) | Sprint 3 | AC-81: API + forced change E2E | TK / 2026-12-12 |
| Not implemented | NFR-12 (F-17) | Sprint 3 | AC-86: API test with fake clock | TK / 2026-12-12 |
| Not measured | NFR-10 (F-17) | Sprint 3 | AC-87: perf smoke p95 < 500 ms | CS / 2026-12-12 |
| Not measured | NFR-11 (F-17) | Sprint 3 | AC-88: widths + axe + keyboard | TK / 2026-12-12 |
| Re-run at release | NFR-08, NFR-09 (AC-74, AC-75) | Needs the `v0.2.0` deploy | TEST-93 on the deployed candidate | TK / 2026-11-29 |

Every other FR/BR/NFR has implemented behaviour and an executed, passing test.

## 3. Acceptance-criteria status

| AC | Sprint | Implemented | Tests | Verification result |
|---|---|---|---|---|
| AC-01 | S1 | Yes | TEST-01 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-02 | S1 | Yes | TEST-02 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-03 | S1 | Yes | TEST-03 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-04 | S1 | Yes | TEST-04 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-05 | S1 | Yes | TEST-05 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-06 | S1 | Yes | TEST-06 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-07 | S1 | Yes | TEST-07, TEST-08 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-08 | S1 | Yes | TEST-09, TEST-10, TEST-50, TEST-52 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-09 | S1 | Yes | TEST-11, TEST-92 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-10 | S1 | Yes | TEST-12, TEST-52, TEST-92 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-11 | S1 | Yes | TEST-13 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-12 | S1 | Yes | TEST-14 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-13 | S1 | Yes | TEST-15 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-14 | S1 | Yes | TEST-16 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-15 | S1 | Yes | TEST-17 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-16 | S1 | Yes | TEST-18, TEST-19 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-17 | S1 | Yes | TEST-20 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-18 | S1 | Yes | TEST-21 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-19 | S1 | Yes | TEST-22 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-20 | S1 | Yes | TEST-23 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-21 | S1 | Yes | TEST-24, TEST-50 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-22 | S1 | Yes | TEST-25 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-23 | S1 | Yes | TEST-26 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-24 | S1 | Yes | TEST-27 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-25 | S1 | Yes | TEST-28, TEST-29, TEST-51 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-26 | S1 | Yes | TEST-30, TEST-31 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-27 | S1 | Yes | TEST-32 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-28 | S1 | Yes | TEST-33, TEST-34 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-29 | S1 | Yes | TEST-35 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-30 | S1 | Yes | TEST-36 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-31 | S1 | Yes | TEST-37, TEST-51 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-32 | S1 | Yes | TEST-38 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-33 | S1 | Yes | TEST-39 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-34 | S1 | Yes | TEST-40 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-35 | S1 | Yes | TEST-41, TEST-42, TEST-50 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-36 | S1 | Yes | TEST-43 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-37 | S1 | Yes | TEST-44 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-38 | S1 | Yes | TEST-45 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-39 | S1 | Yes | TEST-46 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-40 | S1 | Yes | TEST-47 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-41 | S1 | Yes | TEST-48 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-42 | S1 | Yes | TEST-49 | Pass — `v0.1.0` (D1) and regression at `ffeead5` |
| AC-43 | S2 | Yes | TEST-62, TEST-99 | Pass — `ffeead5` (local) + CI on PR |
| AC-44 | S2 | Yes | TEST-60, TEST-62 | Pass — `ffeead5` (local) + CI on PR |
| AC-45 | S2 | Yes | TEST-61, TEST-63 | Pass — `ffeead5` (local) + CI on PR |
| AC-46 | S2 | Yes | TEST-63 | Pass — `ffeead5` (local) + CI on PR |
| AC-47 | S2 | Yes | TEST-64, TEST-99 | Pass — `ffeead5` (local) + CI on PR |
| AC-48 | S2 | Yes | TEST-65 | Pass — `ffeead5` (local) + CI on PR |
| AC-49 | S2 | Yes | TEST-66 | Pass — `ffeead5` (local) + CI on PR |
| AC-50 | S2 | Yes | TEST-67, TEST-99 | Pass — `ffeead5` (local) + CI on PR |
| AC-51 | S2 | Yes | TEST-69, TEST-80 | Pass — `ffeead5` (local) + CI on PR |
| AC-52 | S2 | Yes | TEST-70 | Pass — `ffeead5` (local) + CI on PR |
| AC-53 | S2 | Yes | TEST-68, TEST-71 | Pass — `ffeead5` (local) + CI on PR |
| AC-54 | S2 | Yes | TEST-72, TEST-80 | Pass — `ffeead5` (local) + CI on PR |
| AC-55 | S2 | Yes | TEST-73 | Pass — `ffeead5` (local) + CI on PR |
| AC-56 | S2 | Yes | TEST-74 | Pass — `ffeead5` (local) + CI on PR |
| AC-57 | S2 | Yes | TEST-77, TEST-80 | Pass — `ffeead5` (local) + CI on PR |
| AC-58 | S2 | Yes | TEST-82 | Pass — `ffeead5` (local) + CI on PR |
| AC-59 | S2 | Yes | TEST-81, TEST-83 | Pass — `ffeead5` (local) + CI on PR |
| AC-60 | S2 | Yes | TEST-84 | Pass — `ffeead5` (local) + CI on PR |
| AC-61 | S2 | Yes | TEST-85 | Pass — `ffeead5` (local) + CI on PR |
| AC-62 | S2 | Yes | TEST-86 | Pass — `ffeead5` (local) + CI on PR |
| AC-63 | S2 | Yes | TEST-75 | Pass — `ffeead5` (local) + CI on PR |
| AC-64 | S2 | Yes | TEST-76 | Pass — `ffeead5` (local) + CI on PR |
| AC-65 | S2 | Yes | TEST-78, TEST-80 | Pass — `ffeead5` (local) + CI on PR |
| AC-66 | S2 | Yes | TEST-78 | Pass — `ffeead5` (local) + CI on PR |
| AC-67 | S2 | Yes | TEST-79 | Pass — `ffeead5` (local) + CI on PR |
| AC-68 | S2 | Yes | TEST-87, TEST-88 | Pass — `ffeead5` (local) + CI on PR |
| AC-69 | S2 | Yes | TEST-87, TEST-88 | Pass — `ffeead5` (local) + CI on PR |
| AC-70 | S2 | Yes | TEST-89 | Pass — `ffeead5` (local) + CI on PR |
| AC-71 | S2 | Yes | TEST-90 | Pass — `ffeead5` (local) + CI on PR |
| AC-72 | S2 | Yes | TEST-91 | Pass — `ffeead5` (local) + CI on PR |
| AC-73 | S2 (F-14) | Yes | Lab 5 evidence C-01–C-06 | Pass — Lab 5 C-01–C-06 |
| AC-74 | S2 (F-14) | Yes | Lab 5 evidence C-01–C-06 | Pass — Lab 5 C-01–C-06 |
| AC-75 | S2 (F-14) | Yes | TEST-93 | Pass in Lab 5; re-run at `v0.2.0` (TEST-93) |
| AC-76 | S3 (FR-22) | Yes | TEST-95, TEST-100 | Pass — `ffeead5` (local) + CI on PR |
| AC-77 | S3 (FR-22) | Yes | TEST-96 | Pass — `ffeead5` (local) + CI on PR |
| AC-78 | S3 (FR-22) | Yes | TEST-94, TEST-96 | Pass — `ffeead5` (local) + CI on PR |
| AC-79 | S3 (FR-22) | Yes | TEST-97 | Pass — `ffeead5` (local) + CI on PR |
| AC-80 | S3 (FR-22) | Yes | TEST-98, TEST-100 | Pass — `ffeead5` (local) + CI on PR |
| AC-81 | S3 | No | planned | Planned (D3) — not run |
| AC-82 | S3 | No | planned | Planned (D3) — not run |
| AC-83 | S3 | No | planned | Planned (D3) — not run |
| AC-84 | S3 | No | planned | Planned (D3) — not run |
| AC-85 | S3 | No | planned | Planned (D3) — not run |
| AC-86 | S3 | No | planned | Planned (D3) — not run |
| AC-87 | S3 | No | planned | Planned (D3) — not run |
| AC-88 | S3 | No | planned | Planned (D3) — not run |
| AC-89 | S3 | No | planned | Planned (D3) — not run |
| AC-90 | S1 (Lab 7) | Yes | TEST-101, TEST-103, TEST-104 | Planned (Lab 7) — not run |
| AC-91 | S1 (Lab 7) | Yes | TEST-102, TEST-103 | Planned (Lab 7) — not run |

## 4. Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-14 | Sprint 1 baseline matrix. |
| 2.0 | 2026-11-26 | Sprint 2 complete and Sprint 3 progress: actual files and results for every row, AC status table, SRS 2.0 revisions, explicit gaps. |
