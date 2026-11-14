# Sprint 1 — Test Results

Commands, commit and raw output: `evidence/release-run.txt` (written by `scripts/verify-release.sh`).

| Suite | Command | Files | Passed | Failed | Skipped |
|---|---|---|---|---|---|
| Server unit + API/DB | `npm test --prefix server` | 14 | 97 | 0 | 0 |
| Client component | `npm test --prefix client` | 5 | 6 | 0 | 0 |
| End-to-end (Chromium, 1280 px) | `npx playwright test` | 3 | 4 | 0 | 0 |
| **Total** | | 22 | **107** | **0** | **0** |

Builds: `npm run build --prefix server` (tsc) and `npm run build --prefix client` (tsc + vite) succeed.

## AC → planned test → actual test → result

A = automated. No AC relies on a manual check alone.

| AC | Planned | Actual file › test | Result |
|---|---|---|---|
| AC-01 | TEST-01 | server/tests/api/auth.api.test.ts › TEST-01 signs in with valid credentials… | Pass (A) |
| AC-02 | TEST-02, TEST-09 | auth.api.test.ts › TEST-02 one identical 401…; e2e/access.spec.ts › TEST-09 disabled user cannot sign in | Pass (A) |
| AC-03 | TEST-03 | auth.api.test.ts › TEST-03 rejects a missing e-mail or password | Pass (A) |
| AC-04 | TEST-04 | auth.api.test.ts › TEST-04 returns the caller's own identity | Pass (A) |
| AC-05 | TEST-05, TEST-11 | auth.api.test.ts › TEST-05 sign-out deletes the session; journey.spec.ts (sign-out → /api/auth/me 401) | Pass (A) |
| AC-06 | TEST-06 | unit/session.test.ts › TEST-06 …; auth.api.test.ts › TEST-06 refuses an expired session | Pass (A) |
| AC-07 | TEST-07, TEST-08 | unit/password.test.ts › TEST-07; auth.api.test.ts › TEST-08 | Pass (A) |
| AC-08 | TEST-09, TEST-10, TEST-50, TEST-52 | client/tests/Login.test.tsx › TEST-10; e2e journey/access specs | Pass (A) |
| AC-09 | TEST-11 | api/access.api.test.ts › TEST-11 (10 routes) | Pass (A) |
| AC-10 | TEST-12, TEST-52 | access.api.test.ts › TEST-12 (6 financial routes); e2e/access.spec.ts › TEST-52 | Pass (A) |
| AC-11 | TEST-13 | access.api.test.ts › TEST-13 (2 admin routes) | Pass (A) |
| AC-12 | TEST-14 | access.api.test.ts › TEST-14 cross-site writes are refused | Pass (A) |
| AC-13 | TEST-15 | unit/http-error.test.ts › TEST-15 | Pass (A) |
| AC-14 | TEST-16 | api/accounts.api.test.ts › TEST-16 | Pass (A) |
| AC-15 | TEST-17 | unit/balances.test.ts › TEST-17 (9 cases) | Pass (A) |
| AC-16 | TEST-18, TEST-19 | unit/money.test.ts › TEST-18; balances.test.ts › TEST-19 | Pass (A) |
| AC-17 | TEST-20 | client/tests/Accounts.test.tsx › TEST-20 | Pass (A) |
| AC-18 | TEST-21 | accounts.api.test.ts › TEST-21 | Pass (A) |
| AC-19 | TEST-22 | accounts.api.test.ts › TEST-22 | Pass (A) |
| AC-20 | TEST-23 | accounts.api.test.ts › TEST-23 | Pass (A) |
| AC-21 | TEST-24, TEST-50 | api/transactions.api.test.ts › TEST-24; e2e/journey.spec.ts › TEST-50 | Pass (A) |
| AC-22 | TEST-25, TEST-50 | transactions.api.test.ts › TEST-25; TEST-50 | Pass (A) |
| AC-23 | TEST-26, TEST-50 | transactions.api.test.ts › TEST-26; TEST-50 | Pass (A) |
| AC-24 | TEST-27, TEST-50 | transactions.api.test.ts › TEST-27; TEST-50 | Pass (A) |
| AC-25 | TEST-28, TEST-29, TEST-51 | unit/transaction-rules.test.ts › TEST-28; transactions.api.test.ts › TEST-29; e2e/rules.spec.ts › TEST-51 | Pass (A) |
| AC-26 | TEST-30, TEST-31 | transaction-rules.test.ts › TEST-30 (6 cases); transactions.api.test.ts › TEST-31 | Pass (A) |
| AC-27 | TEST-32 | transaction-rules.test.ts › TEST-32 | Pass (A) |
| AC-28 | TEST-33, TEST-34 | unit/transaction-input.test.ts › TEST-33 (17 cases); transactions.api.test.ts › TEST-34 | Pass (A) |
| AC-29 | TEST-35 | transactions.api.test.ts › TEST-35 | Pass (A) |
| AC-30 | TEST-36 | transactions.api.test.ts › TEST-36 | Pass (A) |
| AC-31 | TEST-37, TEST-51 | client/tests/NewTransaction.test.tsx › TEST-37; TEST-51 | Pass (A) |
| AC-32 | TEST-38 | transactions.api.test.ts › TEST-38 | Pass (A) |
| AC-33 | TEST-39 | transactions.api.test.ts › TEST-39 | Pass (A) |
| AC-34 | TEST-40 | client/tests/History.test.tsx › TEST-40 (2 cases) | Pass (A) |
| AC-35 | TEST-41, TEST-42, TEST-50 | unit/summary.test.ts › TEST-41; api/summary.api.test.ts › TEST-42; TEST-50 | Pass (A) |
| AC-36 | TEST-43 | summary.test.ts › TEST-43 (unit part); summary.api.test.ts › TEST-43 | Pass (A) |
| AC-37 | TEST-44 | summary.api.test.ts › TEST-44 | Pass (A) |
| AC-38 | TEST-45 | api/admin.api.test.ts › TEST-45 | Pass (A) |
| AC-39 | TEST-46 | admin.api.test.ts › TEST-46 | Pass (A) |
| AC-40 | TEST-47 | admin.api.test.ts › TEST-47 | Pass (A) |
| AC-41 | TEST-48 | admin.api.test.ts › TEST-48 | Pass (A) |
| AC-42 | TEST-49 | client/tests/AdminUsers.test.tsx › TEST-49 | Pass (A) |

Supplementary manual check: stop the API, start it again, reload the Overview — the
figures are unchanged (NFR-08, local). The E2E journey also reloads the page and re-reads the data.

## TDD evidence

| Rule | Red (test commit → output) | Green (implementation commit → output) |
|---|---|---|
| Transaction rules BR-01/03/04/05 (TEST-28/30/32) | skeleton commit "TDD red - transaction rules skeleton": 9 assertion failures, e.g. `expected undefined to be 'ALLOCATION_MISMATCH'` — `evidence/tdd-transactions-red.txt` | "record payment/receipt with allocation rules…": all pass — `evidence/tdd-transactions-green.txt` |
| Summary BR-08 (TEST-41/43) | "summary skeleton for TDD red": 3 assertion failures (`expected +0 to be 3400000`) — `evidence/tdd-summary-red.txt` | "financial summary and admin…" — `evidence/tdd-summary-green.txt` |
| Balance engine BR-07 (TEST-17/19) | test commit before `balances.ts` existed: suite fails to load, API tests 404 — `evidence/tdd-balances-red.txt` | "balance engine, accounts list…" — `evidence/tdd-balances-green.txt` |
| Auth (TEST-01..08) | test commit before `session.ts` existed — `evidence/tdd-auth-red.txt` | "sign-in, sign-out…" — `evidence/tdd-auth-green.txt` |

## Test revisions (visible, justified)

- TEST-05: removed the `GET /api/accounts` check from the auth branch, because that route arrives in #4.
  AC-05's account-route check is covered by TEST-11 (all protected routes, including `/api/accounts`).
- TEST-26: the expense-unchanged check depended on `/api/summary`, so it was conditional in #5. It became
  unconditional in #6 when the summary existed.
- E2E specs: nav links were scoped to the navigation bar because "New transaction" appears twice on a page.
  The journey now clicks "Payment / charge" after a receipt. These were selector fixes, not weakened assertions.

## Known limitations and incomplete work

- UI component tests (TEST-10/20/37/40/49) were written alongside the UI, not test-first. TDD was applied
  to the domain rules.
- `parseThb`/`formatThb` (`money.ts`) were written in the scaffold commit before TEST-18, so TEST-18 has no
  red step.
- E2E runs at one viewport (1280 px). The 390/834 px checks are planned in Sprint 3 (NFR-11).
- No sign-in rate limiting yet (NFR-12, Sprint 3). No Docker/CI/GCP yet (Lab 5).
- Accounts are seeded. Users cannot create accounts until Sprint 2 (F-09).
