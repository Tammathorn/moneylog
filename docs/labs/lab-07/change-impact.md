# Lab 7 — Change request CR-L7-01 and impact analysis

Version 1.2 (2026-11-28), written **before implementation** (1.1: TEST-22 rev. 2 and mobile minus sign, found by a local pre-check; 1.2: Lab 7 tests renumbered to TEST-103 – TEST-106 after teammate review, as TEST-101/102 belong to Lab 6). Issue: #64.
Change type: adaptive maintenance (the requirement changed; the Sprint 1 behaviour was correct for the old rule).

## 1. Versions

| Role | Commit / tag | Deployed revision |
|---|---|---|
| Accepted Sprint 1 baseline (old rule delivered) | `v0.1.0` = `088148a` (2026-11-15) | — |
| Actual pre-change implementation | `main` = `910b662` (v0.2.0); `staging` = `b3ba14d` (same tree) | `moneylog-00007-sjc` |
| Intervening development | Sprint 2 F-09 – F-13, Lab 5/6 fixes. Only F-09 touches the same route (archived account → 422 `ACCOUNT_ARCHIVED`); not changed here. | — |

## 2. Old and new rule

| | Rule |
|---|---|
| **Old (BR-09, Sprint 1)** | Opening balances apply only to Cash, Loan Given and Loan Taken accounts, are ≥ 0.00 and ≤ 10,000,000.00 THB, and have an opening date. Setting it again replaces the previous value. (D-09: "No … revisit if UAT disagrees.") |
| **New (BR-09 rev. 3.0)** | Same, except a **Cash** opening balance is from **−10,000,000.00 to 10,000,000.00 THB**. Loan Given / Loan Taken stay 0.00 to 10,000,000.00 THB. Integer satang, at most 2 decimals. |

**Reason.** A user who starts with an overdrawn bank or e-wallet account cannot record the true starting point, although a Cash balance may already go below zero (BR-14, D-05).

**Boundaries.** Cash: −1,000,000,000 satang accepted, −1,000,000,001 rejected, −1 accepted, 1,000,000,000 accepted, 1,000,000,001 rejected. Loan Given / Loan Taken: 0 accepted, −1 rejected.
**Invalid cases.** Out of range, non-integer, non-number → 400 `VALIDATION_FAILED`; Income/Expense → 422 `OPENING_NOT_ALLOWED`; archived → 422 `ACCOUNT_ARCHIVED`; bad date → 400 (unchanged).
**Access.** Owner only (other user's or missing id → 404); Administrator → 403; no session → 401. Unchanged.

## 3. Impact table

| Req. | Feature | SRS | Feature SDS | System SDS | AC | STS | Code module | Impact |
|---|---|---|---|---|---|---|---|---|
| BR-09 | F-04 Opening balance | §5 BR-09 rev. 3.0; §8 D-09, D-18 | F-03/F-04 §3, §6, §7, §8 | §2 Account CHECK | AC-19 rev. 2, AC-90, AC-91 | TEST-103 – TEST-106 (new); TEST-22 (unchanged) | `server/src/routes/accounts.ts` (opening-balance route) | Lower bound by account type |
| BR-09 (data) | F-04 | §5 | F-03/F-04 §7 | §2 | AC-90 | TEST-106 | `server/prisma/migrations/<new>/migration.sql` | Replace CHECK with type-aware CHECK; no data rewrite (all rows ≥ 0) |
| BR-09 (UI) | F-04 | — | F-03/F-04 §6 | §3 (no change) | AC-90, AC-91 | TEST-105 | `client/src/pages/Accounts.tsx` (opening form), optionally a signed parser in `client/src/money.ts` | Accept a leading minus for Cash only |
| BR-07, BR-13, BR-14 | F-03 Balances, F-07 Summary | unchanged | unchanged | unchanged | AC-15, AC-16, AC-17 | TEST-17 – TEST-20, summary tests | `server/src/domain/balances.ts`, summary | No change: balance = opening + Σ effects already handles a negative opening; negative balance already labelled |
| BR-06, BR-20, BR-21 | F-04 access | unchanged | unchanged | §5 permissions | AC-20 | TEST-23, access.api.test.ts | route ownership query | Must stay unchanged (regression) |
| BR-02, BR-10, AC-16 | F-05 Transactions | unchanged | unchanged | unchanged | AC-16, AC-28 | TEST-18, transaction tests | `money.ts` `parseThb`, `transaction-input.ts` | Not changed: transactions still reject signs and non-positive amounts |

**Not applicable, with reason**
- Loans overview (F-13): uses Loan accounts only; their rule is unchanged.
- Admin pages (F-08): an Administrator never sees opening balances (BR-20).
- Seed data: all seeded opening balances are ≥ 0 and stay valid.
- Historical data: every existing row satisfies the new CHECK; nothing is migrated except the constraint.
- Callers/dependencies: the opening-balance route is called only by the Accounts page; `GET /api/accounts`, summary and loans read the value through the unchanged balance engine.

## 4. Behaviour that must not change, and how it is protected

| Preserved behaviour | Regression protection |
|---|---|
| Owner-only access; another user's account → 404; Administrator → 403 | TEST-23, `access.api.test.ts` (Admin denied on every financial route) |
| Loan opening ≥ 0; Income/Expense refused; bad date refused | TEST-22 rev. 2, TEST-104 |
| Balance = opening + Σ effects, exact satang | TEST-17, TEST-19, `summary.api.test.ts` |
| Transactions reject signs and non-positive amounts | TEST-18, transaction API tests |
| Archived account refused (F-09) | `account-management.api.test.ts` |

**Changed old expected result.** TEST-22 (AC-19) sent −1 to the Cash account `Wallet` and expected 400. The new rule makes that value valid for Cash, so that one case becomes −1,000,000,001 (still 400); every other TEST-22 case is kept, and the Loan −1 refusal is covered by TEST-104. No old test is deleted or skipped.

Selected regression suite: full server suite (`npm test --prefix server`), client suite, E2E journey (TEST-50), run with `scripts/verify-release.sh` on the release commit.

## 5. Planned sequence (recorded in Git)

1. This contract PR (docs only) into `staging` → teammate review and approval **before** any code.
2. Test commit TEST-103 – TEST-106 on the pre-change code → RED output saved (TEST-104 passes).
3. Implementation commit (route + migration + form) → GREEN output and full regression.
4. Code PR into `staging` (teammate review, CI) → release PR `staging` → `main` (approval, CI) → GCP deploy → post-deploy checks: negative Cash opening on a synthetic account, Loan −0.01 refused, Administrator 403 on the route, other user's account 404.

## 6. Approval

The course requirement for instructor/TA approval was removed (reported by the Owner on 2026-11-28). Team approval of this contract: teammate review on the contract PR (reviewer, date and comments are recorded on the PR).
