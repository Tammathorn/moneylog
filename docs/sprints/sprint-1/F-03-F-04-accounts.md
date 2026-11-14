# F-03 Accounts and balances · F-04 Opening balance

Contract version 1.0 (2026-11-14) · Issue #4 · Branch `feature/4-accounts`

## 1. Purpose and linked requirements

Show a user their own accounts with correct derived balances (FR-04, FR-08, BR-07, BR-13,
BR-14, NFR-04) and let them set opening balances (FR-05, BR-06, BR-09).

## 2. Behaviour and workflow

- `GET /api/accounts` loads the caller's accounts and all their transaction lines, applies the
  balance engine (`server/src/domain/balances.ts`) and returns each account with `balanceSatang`.
- The Accounts page groups accounts as **Cash**, **Loans taken (debt)**, **Loans given (owed to
  you)**, **Income**, **Expenses**. Each Cash / Loan row has **Set opening balance**: an inline
  form with amount (THB) and date, Save / Cancel.
- On save the client converts THB to satang; the API checks ownership and type, stores the value
  and returns the updated account with its new balance.

**Balance engine (BR-07).** For each transaction with amount *a* per line and total *T*:

| Kind | Header account | Line account type → effect |
|---|---|---|
| PAYMENT | CASH: −T · LOAN_TAKEN: +T | EXPENSE +a · LOAN_TAKEN −a · LOAN_GIVEN +a · CASH +a |
| RECEIPT | CASH: +T | INCOME +a · LOAN_GIVEN −a · LOAN_TAKEN +a · CASH −a |

`balance = openingBalanceSatang + Σ effects`. Signs mean: Cash = money held; Loan Taken = amount
owed by the user; Loan Given = amount owed to the user; Income/Expense = accumulated totals.

## 3. Rules, validation and failure cases

- Money is integer satang. `parseThb("12.5") = 1250`; more than 2 decimals, signs, letters or
  empty are invalid; formatting `1234567 → "฿12,345.67"`, negative `"-฿5.00"`.
- Opening balance: `openingBalanceSatang` integer, 0 ≤ value ≤ 1,000,000,000 (10M THB);
  `openingDate` `YYYY-MM-DD`, valid calendar date, 2000-01-01 ≤ date ≤ today (Asia/Bangkok).
  Otherwise 400 `VALIDATION_FAILED` with `fields`.
- Account type INCOME or EXPENSE → 422 `OPENING_NOT_ALLOWED`.
- Account of another user, non-existent or non-numeric id → 404 `NOT_FOUND` (BR-06, D-11).
- Negative Cash balance is allowed and labelled (BR-14).

## 4. Permissions

`USER` only (`userOnly`). ADMIN → 403 (AC-10). All queries filter `userId = caller.id`.

## 5. API

`GET /api/accounts` → 200

```json
{ "accounts": [ { "id": 3, "name": "KBank Savings", "type": "CASH", "subtype": "BANK",
  "openingBalanceSatang": 1000000, "openingDate": "2026-11-01", "balanceSatang": 3400000,
  "isActive": true } ] }
```

Order: type (CASH, LOAN_TAKEN, LOAN_GIVEN, INCOME, EXPENSE) then name.

`PUT /api/accounts/:id/opening-balance` body `{ "openingBalanceSatang": 1000000, "openingDate":
"2026-11-01" }` → 200 `{ "account": { …same shape… } }`. Errors: 400, 404, 422 as above.

## 6. UI

Accounts page: loading line; empty message "No accounts yet." (cannot happen with the seed but is
handled); error alert on failure; amounts right-aligned in `฿` format; negative values red with
"(negative)". Opening form: amount + date inputs with labels, client checks format before
sending, server `fields` shown under inputs, "Saving…" while busy.

## 7. Data

`Account` table (system SDS §2): `openingBalanceSatang INT NOT NULL DEFAULT 0 CHECK (>= 0)`,
`openingDate DATE NULL`. Created in the `init` migration. No stored balance column (D-02).

## 8. Acceptance criteria

| AC | Given / When / Then |
|---|---|
| AC-14 | Given users A and B with seeded accounts, when A calls `GET /api/accounts`, then only A's accounts are returned (none of B's ids), in the specified order, each with `balanceSatang`. |
| AC-15 | The balance engine applies every effect in the BR-07 table: each header type and each allowed line type moves the right account by the right sign. |
| AC-16 | Money arithmetic is exact: `parseThb` accepts 0–2 decimals and rejects 3 decimals, signs and text; 0.10 + 0.20 THB totals 30 satang; balance = opening + effects. |
| AC-17 | The Accounts page shows each balance as `฿` with thousands separators and marks a negative balance "(negative)". |
| AC-18 | Given A's own Cash account, when A sets opening 10,000.00 THB on 2026-11-01, then 200 and the account's `balanceSatang` rises by 1,000,000 compared with before. |
| AC-19 | Opening on an Income/Expense account → 422 `OPENING_NOT_ALLOWED`; negative, non-integer, > 1,000,000,000, future or malformed date → 400 `VALIDATION_FAILED`; the stored value is unchanged. |
| AC-20 | When A sets an opening balance on B's account id, then 404 `NOT_FOUND`, the same response as a non-existent id, and B's account is unchanged. |

## 9. Test considerations

Unit tests for `money.ts` and `balances.ts` (table-driven, no DB). API tests for ownership and
validation with real DB rows. See `sts.md` TEST-16 – TEST-23.

## Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-14 | First contract, before implementation. |
