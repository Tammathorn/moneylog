# F-05 Record transaction · F-06 Transaction history and detail

Contract version 1.0 (2026-11-14) · Issue #5 · Branch `feature/5-transactions`

## 1. Purpose and linked requirements

The core domain transaction of Sprint 1: record a **Payment / charge** or **Money received** with
allocation lines, enforce every allocation rule, save atomically and show it in history.
FR-06, FR-07, FR-08, FR-09, BR-01 – BR-07, BR-10 – BR-12, BR-15, NFR-05.

## 2. Behaviour and workflow

1. User opens **New transaction**, picks **Payment / charge** or **Money received**.
2. Picks the header account (Payment: Cash or Loan Taken; Receipt: Cash), date (default today),
   total, optional description.
3. Adds 1–20 lines: account (filtered to the allowed types for the kind, excluding the header
   account), amount, optional note. The form shows **Allocated** and **Remaining** live; Save is
   disabled while Remaining ≠ 0.
4. API validates shape (400) → resolves accounts **within the caller's accounts** (422
   `ACCOUNT_NOT_FOUND`) → applies rules (422) → inserts header + lines in **one DB transaction**
   → returns 201 with the saved transaction.
5. UI shows "Transaction saved" and links to its detail; balances, summary and history now
   include it (derived, BR-13).
6. History lists the caller's transactions (date desc, then created desc); detail shows header
   and lines with account names and types.

## 3. Rules and validation (order of checks)

| Step | Check | Failure |
|---|---|---|
| 1 | `kind` ∈ PAYMENT, RECEIPT; `accountId` positive integer; `date` `YYYY-MM-DD` real date, 2000-01-01 ≤ date ≤ today (Asia/Bangkok) (BR-10); `totalSatang` integer 1 … 1,000,000,000 (BR-02); `description` optional string ≤ 200 after trim (BR-11); `lines` array of 1–20; each line `accountId` positive integer, `amountSatang` integer 1 … 1,000,000,000, `note` optional ≤ 100 | 400 `VALIDATION_FAILED`, `fields` e.g. `{"lines[1].amountSatang": "…"}` |
| 2 | Header and every line account exist, belong to the caller and are active (BR-06) | 422 `ACCOUNT_NOT_FOUND` |
| 3 | Header type allowed for kind (BR-03); every line type allowed for kind (BR-04) | 422 `ACCOUNT_TYPE_NOT_ALLOWED` |
| 4 | No line uses the header account; no account repeated across lines (BR-05) | 422 `DUPLICATE_LINE_ACCOUNT` |
| 5 | Σ line amounts = total (BR-01) | 422 `ALLOCATION_MISMATCH` "Allocated ฿X does not equal the total ฿Y." |

Steps 3–5 live in the pure function `validateTransactionRules()` in
`server/src/domain/transaction-rules.ts`. Any `userId` in the body is ignored.

## 4. Permissions

`USER` only. ADMIN → 403. Another user's account referenced in the body → 422
`ACCOUNT_NOT_FOUND` (indistinguishable from a non-existent id). Another user's transaction id in
the path → 404.

## 5. API

`POST /api/transactions`

```json
{ "kind": "PAYMENT", "accountId": 5, "date": "2026-11-10", "totalSatang": 185000,
  "description": "Central World",
  "lines": [ { "accountId": 9, "amountSatang": 65000, "note": "lunch" },
             { "accountId": 10, "amountSatang": 120000 } ] }
```

→ 201 `{ "transaction": TransactionDTO }` where TransactionDTO =
`{ id, kind, date, totalSatang, description, createdAt, account: { id, name, type },
lines: [ { id, amountSatang, note, account: { id, name, type } } ] }`.

`GET /api/transactions?limit=50&offset=0` (limit 1–100, default 50) → 200
`{ "items": TransactionDTO[], "total": number }`.

`GET /api/transactions/:id` → 200 `{ "transaction": TransactionDTO }`; other's/unknown/non-numeric
id → 404 `NOT_FOUND`.

## 6. UI

New transaction: kind toggle (two buttons, `aria-pressed`), header account select (grouped by
type), date, total (THB text input with numeric keyboard), description, line rows with account
select, amount, note, **Remove line**, **Add line** (max 20). Live "Allocated ฿… · Remaining ฿…";
Remaining in red when ≠ 0. Save disabled when Remaining ≠ 0 or while saving ("Saving…"). Server
422 shown as an alert above the form; 400 `fields` under the matching input; values kept.
History: loading, empty ("No transactions yet — record your first one."), table with date, kind,
account, description, total; row links to detail. Detail: header fields and a lines table.

## 7. Data

`MoneyTransaction`, `TransactionLine` (system SDS §2) from the `init` migration, with CHECK
`totalSatang > 0`, CHECK `amountSatang > 0`, UNIQUE(transactionId, accountId), FKs and index
(userId, date). Insert uses `prisma.$transaction` (NFR-05).

## 8. Acceptance criteria

Journey figures used below: opening KBank 10,000.00; salary 25,000.00; card purchase 1,850.00 =
Dining 650.00 + Groceries 1,200.00; card repayment 1,000.00 from KBank.

| AC | Given / When / Then |
|---|---|
| AC-21 | Given A's bank and expense accounts, when A records a PAYMENT from the bank with one Expense line, then 201, one header row and its line exist in the DB with A's userId, and the bank balance falls and the expense balance rises by the amount. |
| AC-22 | When A records the card purchase (PAYMENT from KTC card, Dining 650.00 + Groceries 1,200.00), then card debt rises by 1,850.00 and Dining/Groceries rise by 650.00/1,200.00. |
| AC-23 | When A repays 1,000.00 to the card (PAYMENT from bank, one Loan Taken line to the card), then bank −1,000.00, card debt −1,000.00 and total expenses are unchanged. |
| AC-24 | When A records salary (RECEIPT into bank, one Income line 25,000.00), then bank +25,000.00 and Salary +25,000.00. |
| AC-25 | When line amounts sum to anything other than the total (e.g. 1,849.99 vs 1,850.00), then 422 `ALLOCATION_MISMATCH` and the transaction and line row counts are unchanged. |
| AC-26 | PAYMENT from an Expense or Income account, RECEIPT into a Loan Taken account, a PAYMENT line to an Income account, or a RECEIPT line to an Expense account → 422 `ACCOUNT_TYPE_NOT_ALLOWED`, nothing saved. |
| AC-27 | A line that uses the header account, or two lines with the same account → 422 `DUPLICATE_LINE_ACCOUNT`. |
| AC-28 | Boundaries: total/line 0, negative, fractional or > 1,000,000,000 satang; 0 or 21 lines; tomorrow's date, 1999-12-31, `2026-02-30`, `10/11/2026`; description of 201 characters → 400 `VALIDATION_FAILED` with the field named. 1 satang, 1,000,000,000 satang, 20 lines, today, 2000-01-01 and 200 characters are accepted. |
| AC-29 | When A uses B's account id as header or line, then 422 `ACCOUNT_NOT_FOUND` — the same response as id 999999 — and nothing is saved for either user. |
| AC-30 | If inserting a line fails inside the DB transaction, the header row is rolled back (no partial transaction). |
| AC-31 | In the form, Remaining updates as amounts are typed, Save stays disabled until Remaining is ฿0.00, and a server rule error is shown while the entered values are kept. |
| AC-32 | `GET /api/transactions` returns only the caller's transactions, ordered date desc then created desc, with `total` = the caller's count. |
| AC-33 | `GET /api/transactions/:id` returns the caller's transaction with its lines and account names; B's id, an unknown id and `abc` return 404 `NOT_FOUND`. |
| AC-34 | History shows the empty message when there are no transactions and a row per transaction otherwise. |

## 9. Test considerations

Rules are unit-tested first (TDD) in `transaction-rules.test.ts`; persistence and ownership are
API/DB tests; AC-30 calls the repository with an invalid line account to force a FK failure.
See `sts.md` TEST-24 – TEST-40.

## Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-14 | First contract, before implementation. |
