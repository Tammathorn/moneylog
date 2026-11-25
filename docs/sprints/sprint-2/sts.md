# Sprint 2 — Software Test Specification (STS)

Version 1.0 (2026-11-25), written before implementation. Levels as in Sprint 1: **U** unit,
**A** API/DB integration (Express + real PostgreSQL `moneylog_test`), **C** UI component (Vitest +
Testing Library, `fetch` mocked), **E** end-to-end (Playwright against the real UI, API and DB).
Results are recorded in `docs/sprints/sprint-2/test-results.md` after execution. All Sprint 1 tests
(TEST-01 – TEST-57) are re-run as regression on every Sprint 2 PR and on the release commit.

## F-09 Account management

| Test | AC | Lvl | Precondition / input | Action | Expected result | File |
|---|---|---|---|---|---|---|
| TEST-60 | AC-44 | U | name "", "   ", 60 and 61 chars; each type with valid/invalid subtypes | `parseAccountInput()` | blank/61 → `fields.name`; 60 ok; subtype table of §3 step 4 enforced; LOAN_GIVEN default PERSONAL; INCOME/EXPENSE subtype → error | server/tests/unit/account-rules.test.ts |
| TEST-61 | AC-45 | U | "KBank Savings" vs " kbank savings " / "KBank Saving" | `sameName()` | true / false | account-rules.test.ts |
| TEST-62 | AC-43, AC-44 | A | Signed-in A | POST valid; POST each invalid body | 201 with balance 0, isActive true, inUse false, listed in A's GET only; invalid → 400 field, account count unchanged | server/tests/api/account-management.api.test.ts |
| TEST-63 | AC-45, AC-46 | A | A has KBank Savings; B exists | create/rename to " kbank savings "; B creates "KBank Savings"; A renames KBank → "KBank Main"; A renames B's id | 409 ACCOUNT_NAME_TAKEN ×2; B 201; 200 and transaction detail shows "KBank Main"; B's id 404, B unchanged | account-management.api.test.ts |
| TEST-64 | AC-47 | A | A has a salary transaction into KBank | archive KBank; GET accounts + summary; POST tx with KBank as header and as line; PUT opening; restore; POST again | balance & summary unchanged; 422 ACCOUNT_ARCHIVED ×3, tx count unchanged; after restore 201 | account-management.api.test.ts |
| TEST-65 | AC-48 | A | New unused account; KBank used as header; Dining used as line | DELETE each; DELETE B's id | 204 and gone; 422 ACCOUNT_IN_USE ×2 (rows remain); 404 | account-management.api.test.ts |
| TEST-66 | AC-49 | A | Unused account; used account; account with opening balance | PATCH type/subtype | 200; 422 ACCOUNT_TYPE_LOCKED ×2, type unchanged | account-management.api.test.ts |
| TEST-67 | AC-50 | C | fetch mocked with active + archived accounts | create via form; press Archive; render New transaction pickers | new row in its group; row moves to Archived with Restore; archived account absent from pickers | client/tests/Accounts.test.tsx, client/tests/NewTransaction.test.tsx |

## F-10 Transaction correction · F-12 Favourites and Duplicate

| Test | AC | Lvl | Precondition / input | Action | Expected result | File |
|---|---|---|---|---|---|---|
| TEST-68 | AC-53 | U | Own accounts (some archived), saved transaction using archived Dining | `editableAccounts(own, saved)` | active accounts + archived accounts already on the transaction; other archived excluded | server/tests/unit/transaction-rules.test.ts |
| TEST-69 | AC-51 | A | A has the journey card purchase | PUT with Groceries 1,000.00, total 1,650.00 | 200; same id, exactly 2 lines; KTC −200.00, Groceries −200.00, expenses −200.00; createdAt/isFavourite kept, updatedAt set | server/tests/api/transaction-correction.api.test.ts |
| TEST-70 | AC-52 | A | Same | PUT mismatch, Income line on PAYMENT, 3-decimal, zero, future date | 422/422/400/400/400 as for POST; header and lines deep-equal to before | transaction-correction.api.test.ts |
| TEST-71 | AC-53 | A | Dining archived after the purchase | PUT changing only description; PUT replacing Groceries with archived Electricity | 200; 422 ACCOUNT_ARCHIVED | transaction-correction.api.test.ts |
| TEST-72 | AC-54 | A | Balances and summary captured before salary | POST salary, DELETE it | 204; lines gone; balances and summary equal to the captured values; GET id 404 | transaction-correction.api.test.ts |
| TEST-73 | AC-55 | A | B owns a transaction; ADMIN signed in | A: PUT/DELETE/favourite B's id, 999999, abc; ADMIN: PUT/DELETE | 404 NOT_FOUND ×9, B's row (fields, lines, flag) unchanged; ADMIN 403 | transaction-correction.api.test.ts, server/tests/api/access.api.test.ts |
| TEST-74 | AC-56 | A | Saved transaction | `replaceTransaction()` with a line account id that violates the FK | throws; old header and lines unchanged | transaction-correction.api.test.ts |
| TEST-75 | AC-63 | A | A's transaction; B's transaction | PUT favourite true, false, "yes", {}; on B's id | 200 true; 200 false; 400 ×2; 404 and B's flag unchanged | server/tests/api/favourites.api.test.ts |
| TEST-76 | AC-64 | A | A has 2 favourites of 3; B has 1 favourite | A: GET ?favourite=true | exactly A's 2, never B's | favourites.api.test.ts |
| TEST-77 | AC-57 | C | fetch mocked: GET tx, PUT, DELETE | Edit → change → Save changes; Delete → Confirm delete | form pre-filled; PUT body correct; detail shows new values; DELETE called then navigate to History | client/tests/TransactionDetail.test.tsx |
| TEST-78 | AC-65, AC-66 | C | Source tx (one line account archived) | open /transactions/new?from=id | fields pre-filled, date = today, archived line empty with the message; no POST until Save | client/tests/NewTransaction.test.tsx |
| TEST-79 | AC-67 | C | fetch mocked | press star on detail and on a History row; tick Favourites only | PUT favourite sent, `aria-pressed` toggles; list request has favourite=true | TransactionDetail.test.tsx, History.test.tsx |
| TEST-80 | AC-51, AC-54, AC-57, AC-65 | E | Fresh user with the journey | edit the card purchase in the UI, duplicate the salary, delete the duplicate | Overview/Accounts show the edited figures; duplicate appears then disappears; history count back | e2e/correction.spec.ts |

## F-11 History search, filter and pagination

| Test | AC | Lvl | Precondition / input | Action | Expected result | File |
|---|---|---|---|---|---|---|
| TEST-81 | AC-59 | U | Each invalid query of AC-59 and a valid full query | `parseHistoryFilter()` | field errors named; valid query → typed filter object | server/tests/unit/history-filter.test.ts |
| TEST-82 | AC-58 | A | A's 5 known transactions | GET with each single filter and one AND pair | expected ids in order; total = count | server/tests/api/history-filter.api.test.ts |
| TEST-83 | AC-59 | A | Signed-in A | GET with each invalid query | 400 VALIDATION_FAILED with the field | history-filter.api.test.ts |
| TEST-84 | AC-60 | A | B has matching transactions | A: GET with filters matching B's data; accountId = B's account | none of B's ids; 0 items | history-filter.api.test.ts |
| TEST-85 | AC-61 | A | 5 matching | limit=2&offset=2 | items 3 and 4, total 5 | history-filter.api.test.ts |
| TEST-86 | AC-62 | C | fetch mocked (total 120) | Apply filters, Next, Clear; empty result | query string sent; "Showing 1–50 of 120", then 51–100; cleared; empty message | client/tests/History.test.tsx |

## F-13 Loan overview

| Test | AC | Lvl | Precondition / input | Action | Expected result | File |
|---|---|---|---|---|---|---|
| TEST-87 | AC-68, AC-69 | U | Loan Given with opening, lend 5,000.00, repay 2,000.00; Loan Taken card journey | `loanHistory()` | changes +500000/−200000; running ends 300000 = `computeBalances`; card ends 85000; opening row first | server/tests/unit/loans.test.ts |
| TEST-88 | AC-68, AC-69 | A | A with the AC-68 data | GET /api/loans | outstanding 300000 and 85000 equal GET /api/accounts balances; history rows and totals | server/tests/api/loans.api.test.ts |
| TEST-89 | AC-70 | A | B with loans; ADMIN; anonymous | A: GET; ADMIN GET; anonymous GET | no B data; 403 FORBIDDEN_ROLE; 401 AUTH_REQUIRED | loans.api.test.ts, access.api.test.ts |
| TEST-90 | AC-71 | A | Archived loan with outstanding, archived settled loan | GET /api/loans | first listed with isActive false; second absent | loans.api.test.ts |
| TEST-91 | AC-72 | C | fetch mocked (data / empty) | render Loans | sections, totals, rows; "No loans here." | client/tests/Loans.test.tsx |

## Regression and pipeline

| Test | AC | Lvl | Action | Expected result | Where |
|---|---|---|---|---|---|
| TEST-92 | AC-09, AC-10 (extended) | A | New protected routes (POST/PATCH/DELETE accounts, PUT/DELETE transactions, favourite, GET loans) anonymous and as ADMIN | 401 AUTH_REQUIRED / 403 FORBIDDEN_ROLE, no data | access.api.test.ts |
| TEST-93 | AC-75 | E | Merge of the Sprint 2 release into `main` | Deploy demo green; smoke test: `/api/version` = merge SHA; critical journey + persisted record checked on the deployed URL | GitHub Actions run, `deploy/smoke_test.py` |

## Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-25 | Test design before implementation. |
