# Sprint 2 — Test results and completion table

Version 1.0 (2026-11-26). Results of the Sprint 2 STS (TEST-60 – TEST-93) plus the Sprint 1
regression suite. "Pass" means the test was executed and passed on the stated commit;
nothing below is marked passed without a run.

## 1. Runs

| Run | Commit | Command / where | Passed | Failed | Skipped |
|---|---|---|---|---|---|
| Server unit + API/DB (local, PostgreSQL 16) | `ffeead5` (top of the Sprint 2/3 stack) | `cd server && npm test` | 216 | 0 | 0 |
| Client component (local) | `ffeead5` | `cd client && npm test` | 26 | 0 | 0 |
| End-to-end (local, real UI + API + DB) | `ffeead5` | `npx playwright test` | 5 | 0 | 0 |
| CI `test-and-docker` PR #45 (contracts) | `fe0fa02` | GitHub Actions run 45574823759 | all | 0 | 0 |
| CI PR #46 (F-09) | `78a8e7f` | run 45575607064 | all | 0 | 0 |
| CI PR #47 (F-10, F-12) | `14eac4d` | run 45744006766 | all | 0 | 0 |
| CI PR #48 (F-11) | `aeb3a93` | run 45744626293 | all | 0 | 0 |
| CI PR #49 (F-13) | `1a81a4a` | run 45745006177 | all | 0 | 0 |
| CI PR #50 (Sprint 3, FR-22) | `ffeead5` | run 45745376028 | all | 0 | 0 |
| Release candidate on `main` | filled at release (`v0.2.0`) | CI + Deploy demo | — | — | — |

The server count includes the Sprint 1 regression (TEST-01 – TEST-57) and the Sprint 3 FR-22
tests (TEST-94 – TEST-97). No test was skipped or weakened; the only changed Sprint 1
expectation is TEST-16, which now includes the contract's new `inUse` field (BL-06).

## 2. TDD evidence (red → green)

| Feature | Red commit (tests + stub) | Red result | Green commit | Green result | Output |
|---|---|---|---|---|---|
| F-09 | `7d74713` | 34 failed / 5 passed (server), 3 failed (client) | `888d702` | 65/65 + 6/6 | `evidence/tdd-F-09-*.txt` |
| F-10, F-12 | `0a8fd12` | 9 failed (server), 6 failed (client) | `7a71561` | 47/47 + 6/6 | `evidence/tdd-F-10-F-12-*.txt` |
| F-11 | `98ade28` | 34 failed / 5 passed (server), 2 failed (client) | `d11dcad` | 50/50 + 5/5 | `evidence/tdd-F-11-*.txt` |
| F-13 | `216bd43` | 7 failed / 1 passed (server), 2 failed (client) | `8431dd7` | 34/34 + 2/2 |
| F-16 FR-22 (Sprint 3) | `0cf1b29` | 11 failed (server), 3 failed (client) | `61f4195` | 11/11 + 3/3 | `evidence/tdd-F-13-*.txt` |

The few tests that already passed at "red" are cases where the stub or the missing route happened
to give the expected answer (e.g. another user's id → 404); they are listed in the output files.

## 3. Sprint 2 feature completion table

| Feature | AC | Implementation | Executed verification | Result | Accepted release |
|---|---|---|---|---|---|
| F-09 Account management | AC-43 – AC-50 | `routes/accounts.ts`, `domain/account-rules.ts`, `pages/Accounts.tsx` (PR #46) | TEST-60 – TEST-67, TEST-92 | Pass (local + CI 45575607064) | `v0.2.0` (at release) |
| F-10 Transaction correction | AC-51 – AC-57 | `routes/transactions.ts` PUT/DELETE, `replaceTransaction`, `editableAccounts`, form edit mode, detail actions (PR #47) | TEST-68 – TEST-74, TEST-77, TEST-80, TEST-92 | Pass (local + CI 45744006766) | `v0.2.0` |
| F-11 History search/filter | AC-58 – AC-62 | `domain/history-filter.ts`, GET `/api/transactions`, History filter bar + pager (PR #48) | TEST-81 – TEST-86 | Pass (local + CI 45744626293) | `v0.2.0` |
| F-12 Favourites and Duplicate | AC-63 – AC-67 | PUT `/favourite`, `?favourite=true`, star, Duplicate mode (PR #47) | TEST-75 – TEST-79, TEST-80 | Pass (local + CI 45744006766) | `v0.2.0` |
| F-13 Loan overview | AC-68 – AC-72 | `domain/loans.ts`, `routes/loans.ts`, `pages/Loans.tsx` (PR #49) | TEST-87 – TEST-91, TEST-92 | Pass (local + CI 45745006177) | `v0.2.0` |
| F-14 Delivery pipeline | AC-73 – AC-75 | Lab 5 (PRs #24 – #28, #31 – #35) | TEST-53 – TEST-57; Lab 5 C-01 – C-06; TEST-93 at release | Pass (Lab 5); TEST-93 runs at `v0.2.0` | Lab 5 releases A/B/C; `v0.2.0` |

## 4. Known limitations (disclosed)

- `v0.2.0` is released after the teammate approves the stacked PRs (#45 – #50) and after the Lab 6
  partner team has finished testing the Sprint 1 deployment (DoD 7); this table is updated then.
- Duplicate leaves archived accounts empty instead of offering a replacement automatically (AC-66 by design).
- A transaction edit has no history of previous versions (D-15).
