# Sprint 1 — Software Test Specification (STS)

Version 1.0 (2026-11-14), written before implementation. Levels: **U** unit (pure functions),
**A** API/DB integration (Express + real PostgreSQL `moneylog_test`), **C** UI component
(Vitest + Testing Library, `fetch` mocked), **E** end-to-end (Playwright, real UI + API + DB).
Result column is filled in `docs/sprints/sprint-1/test-results.md` after execution.

| Test | AC | Lvl | Precondition / input | Action | Expected result | File |
|---|---|---|---|---|---|---|
| TEST-01 | AC-01 | A | Enabled user with known password | POST /api/auth/login | 200; body.user has exactly id,email,displayName,role; Set-Cookie ml_session with HttpOnly, SameSite=Strict | server/tests/api/auth.api.test.ts |
| TEST-02 | AC-02, BR-24 | A | Wrong password; unknown e-mail; disabled user | POST /api/auth/login ×3 | 401 INVALID_CREDENTIALS, identical messages, no Set-Cookie | auth.api.test.ts |
| TEST-03 | AC-03 | A | `{}` and `{email}` only | POST /api/auth/login | 400 VALIDATION_FAILED, fields.email / fields.password | auth.api.test.ts |
| TEST-04 | AC-04 | A | Signed-in agent; anonymous agent | GET /api/auth/me | 200 own identity; 401 AUTH_REQUIRED | auth.api.test.ts |
| TEST-05 | AC-05 | A | Signed-in agent, token captured | POST /api/auth/logout, then reuse token | 204, cookie Max-Age=0, row deleted, me & accounts → 401 | auth.api.test.ts |
| TEST-06 | AC-06 | U+A | Session row with expiresAt in the past | isSessionExpired(); GET /api/auth/me | true at/after expiry; 401 and row deleted | server/tests/unit/session.test.ts, auth.api.test.ts |
| TEST-07 | AC-07 | U | Password "Secret-123" | hashPassword ×2, verifyPassword | `scrypt$` format, two hashes differ, right → true, wrong → false | server/tests/unit/password.test.ts |
| TEST-08 | AC-07, NFR-02 | A | Seeded user | Read User row | passwordHash starts `scrypt$`, ≠ password | auth.api.test.ts |
| TEST-09 | AC-08 | E | Seeded alice / admin | Sign in through UI | USER → Overview with name; ADMIN → Users | e2e/journey.spec.ts, e2e/access.spec.ts |
| TEST-10 | AC-08 | C | fetch → 401 | Submit sign-in form | Shows "E-mail or password is incorrect." | client/tests/Login.test.tsx |
| TEST-11 | AC-09, NFR-01 | A | Anonymous agent | Call each of the 9 protected routes | 401 AUTH_REQUIRED, body keys = [error] | server/tests/api/access.api.test.ts |
| TEST-12 | AC-10, BR-20 | A | Signed-in ADMIN | GET/PUT/POST every financial route | 403 FORBIDDEN_ROLE, no financial keys | access.api.test.ts |
| TEST-13 | AC-11 | A | Signed-in USER | GET /api/admin/users, PATCH /api/admin/users/:id | 403 FORBIDDEN_ROLE | access.api.test.ts |
| TEST-14 | AC-12 | A | Signed-in USER, Origin evil.example | POST /api/transactions | 403 ORIGIN_NOT_ALLOWED, transaction count unchanged | access.api.test.ts |
| TEST-15 | AC-13, NFR-06 | U | Error thrown in a handler | errorHandler(err) | 500 INTERNAL_ERROR, generic message, no stack | server/tests/unit/http-error.test.ts |
| TEST-16 | AC-14, BR-21 | A | Users A and B with accounts | A: GET /api/accounts | Only A's ids; order by type then name; balanceSatang present | server/tests/api/accounts.api.test.ts |
| TEST-17 | AC-15, BR-07 | U | Table of every kind × header type × line type | computeBalances() | Each account moves by the specified sign | server/tests/unit/balances.test.ts |
| TEST-18 | AC-16, NFR-04 | U | "12.5", "0.1", "1.234", "-1", "abc", "" | parseThb(), formatThb() | 1250, 10, null×4; "฿12,345.67", "-฿5.00" | server/tests/unit/money.test.ts |
| TEST-19 | AC-16 | U | Opening 10 satang + lines 10 and 20 | computeBalances() | Exactly 40 satang; opening included | balances.test.ts |
| TEST-20 | AC-17 | C | fetch → accounts incl. negative | Render Accounts page | ฿ format; "(negative)" label | client/tests/Accounts.test.tsx |
| TEST-21 | AC-18 | A | A's Cash account | PUT opening 1,000,000 @ 2026-11-01 | 200; balance +1,000,000 | accounts.api.test.ts |
| TEST-22 | AC-19 | A | A's Expense account; bad bodies | PUT opening | 422 OPENING_NOT_ALLOWED; 400 ×5 (−1, 1.5, 1,000,000,001, tomorrow, "2026-13-01"); value unchanged | accounts.api.test.ts |
| TEST-23 | AC-20, BR-06 | A | B's account id; id 999999 | A: PUT opening | Both 404 NOT_FOUND identical; B unchanged | accounts.api.test.ts |
| TEST-24 | AC-21, FR-06 | A | A's bank + Electricity | POST PAYMENT 120,000 | 201; 1 header + 1 line in DB with userId A; balances −/+ | server/tests/api/transactions.api.test.ts |
| TEST-25 | AC-22 | A | A's card, Dining, Groceries | POST card purchase 65,000+120,000 | Card +185,000; Dining +65,000; Groceries +120,000 | transactions.api.test.ts |
| TEST-26 | AC-23, BR-08 | A | After TEST-25 | POST PAYMENT bank → card line 100,000 | Bank −100,000; card −100,000; summary expense unchanged | transactions.api.test.ts |
| TEST-27 | AC-24, FR-07 | A | A's bank, Salary | POST RECEIPT 2,500,000 | Bank +2,500,000; Salary +2,500,000 | transactions.api.test.ts |
| TEST-28 | AC-25, BR-01 | U | Lines 184,999 vs total 185,000 | validateTransactionRules() | ALLOCATION_MISMATCH | server/tests/unit/transaction-rules.test.ts |
| TEST-29 | AC-25, NFR-05 | A | Same mismatch | POST /api/transactions | 422 ALLOCATION_MISMATCH; tx and line counts unchanged | transactions.api.test.ts |
| TEST-30 | AC-26, BR-03/04 | U | 4 disallowed combinations | validateTransactionRules() | ACCOUNT_TYPE_NOT_ALLOWED each | transaction-rules.test.ts |
| TEST-31 | AC-26 | A | PAYMENT line to Income | POST | 422 ACCOUNT_TYPE_NOT_ALLOWED, nothing saved | transactions.api.test.ts |
| TEST-32 | AC-27, BR-05 | U | Line = header; repeated line account | validateTransactionRules() | DUPLICATE_LINE_ACCOUNT | transaction-rules.test.ts |
| TEST-33 | AC-28, BR-02/10/11 | U | Each boundary in AC-28 (invalid and valid sides) | parseTransactionInput() | Invalid → field error named; valid → accepted | server/tests/unit/transaction-input.test.ts |
| TEST-34 | AC-28 | A | total 0; 21 lines; tomorrow | POST | 400 VALIDATION_FAILED with field | transactions.api.test.ts |
| TEST-35 | AC-29, BR-06 | A | B's account as header; as line; id 999999 | A: POST | 422 ACCOUNT_NOT_FOUND identical; counts unchanged | transactions.api.test.ts |
| TEST-36 | AC-30, BR-12 | A | Repository call with line accountId that violates FK | insertTransaction() | Throws; no header row with that description | transactions.api.test.ts |
| TEST-37 | AC-31 | C | Form with accounts mocked | Type total & lines; mock 422 | Remaining updates; Save disabled until 0; alert shown, values kept | client/tests/NewTransaction.test.tsx |
| TEST-38 | AC-32, BR-15 | A | A has 3 tx on 2 dates; B has 1 | A: GET /api/transactions | Only A's 3; date desc then created desc; total = 3 | transactions.api.test.ts |
| TEST-39 | AC-33 | A | A's tx; B's tx; 999999; "abc" | A: GET /api/transactions/:id | 200 with lines + names; 404 ×3 | transactions.api.test.ts |
| TEST-40 | AC-34 | C | fetch → empty; → 2 items | Render History | Empty message; 2 rows | client/tests/History.test.tsx |
| TEST-41 | AC-35, BR-08 | U | Journey data in memory | buildSummary() | Figures exactly as AC-35 | server/tests/unit/summary.test.ts |
| TEST-42 | AC-35 | A | Journey via API | GET /api/summary | Figures exactly as AC-35 | server/tests/api/summary.api.test.ts |
| TEST-43 | AC-36 | A+U | Tx on 2026-10-15 and 2026-11-10 | GET ?from=2026-11-01&to=2026-11-30; bad ranges | Only November flows; balances all-time; 400 for from>to and "2026-1-1" | summary.api.test.ts, summary.test.ts |
| TEST-44 | AC-37 | A | B records a big expense | A: GET /api/summary | A's figures unchanged | summary.api.test.ts |
| TEST-45 | AC-38, BR-20 | A | Signed-in admin | GET /api/admin/users | Users with exactly the 6 keys | server/tests/api/admin.api.test.ts |
| TEST-46 | AC-39, BR-23 | A | B signed in | Admin PATCH B false; B me; B login; PATCH true; B login | 200; 401; 401; 200; 200 | admin.api.test.ts |
| TEST-47 | AC-40, BR-22 | A | Admin | PATCH own id false | 422 SELF_DISABLE_FORBIDDEN; still active | admin.api.test.ts |
| TEST-48 | AC-41 | A | Admin | PATCH 999999; body {} and {isActive:"no"} | 404; 400; 400 | admin.api.test.ts |
| TEST-49 | AC-42 | C | fetch → users; PATCH ok | Click Disable | Badge becomes Disabled | client/tests/AdminUsers.test.tsx |
| TEST-50 | AC-08, AC-21–24, AC-35 | E | Fresh seeded alice | Sign in → set opening → salary → card purchase split → card repayment → Overview → History → sign out | Overview shows AC-35 figures; history 3 rows; after sign-out /api/auth/me is 401 | e2e/journey.spec.ts |
| TEST-51 | AC-25, AC-31 | E | Signed-in alice | Enter total 1,850.00 with lines 650.00 + 1,199.99 | Save disabled, Remaining ฿0.01; forcing the API call returns 422 and history unchanged | e2e/rules.spec.ts |
| TEST-52 | AC-10, AC-08 | E | Signed-in admin | Open /accounts; call /api/summary from the page | "not available for your role"; API 403 | e2e/access.spec.ts |

**Coverage check.** Every AC-01 – AC-42 appears above (AC → tests): AC-01 T01 · AC-02 T02 ·
AC-03 T03 · AC-04 T04 · AC-05 T05 · AC-06 T06 · AC-07 T07,T08 · AC-08 T09,T10,T50,T52 · AC-09 T11 ·
AC-10 T12,T52 · AC-11 T13 · AC-12 T14 · AC-13 T15 · AC-14 T16 · AC-15 T17 · AC-16 T18,T19 · AC-17
T20 · AC-18 T21 · AC-19 T22 · AC-20 T23 · AC-21 T24,T50 · AC-22 T25,T50 · AC-23 T26,T50 · AC-24
T27,T50 · AC-25 T28,T29,T51 · AC-26 T30,T31 · AC-27 T32 · AC-28 T33,T34 · AC-29 T35 · AC-30 T36 ·
AC-31 T37,T51 · AC-32 T38 · AC-33 T39 · AC-34 T40 · AC-35 T41,T42,T50 · AC-36 T43 · AC-37 T44 ·
AC-38 T45 · AC-39 T46 · AC-40 T47 · AC-41 T48 · AC-42 T49. No AC is unmapped.

**TDD targets** (test committed failing before implementation): TEST-28/30/32
(`transaction-rules`), TEST-17/19 (`balances`), TEST-41 (`summary`).

## Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-14 | Planned tests, before implementation. |
