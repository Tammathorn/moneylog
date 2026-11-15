# F-07 Financial summary · F-08 User administration (enable/disable)

Contract version 1.0 (2026-11-14) · Issue #6 · Branch `feature/6-summary-admin`

## Part 1 — F-07 Financial summary

### 1. Purpose and linked requirements

FR-10, BR-08 (only Income lines are income; only Expense lines are expenses), BR-21.

### 2. Behaviour

`GET /api/summary?from=YYYY-MM-DD&to=YYYY-MM-DD` (both optional). The server loads the caller's
accounts and transactions and computes with the pure function `buildSummary()`
(`server/src/domain/summary.ts`):

- `cash`: `{ totalSatang, accounts: [{ id, name, subtype, balanceSatang }] }` — current balances.
- `debt`: Loan Taken accounts and their total (credit-card debt and other borrowing).
- `loansGiven`: Loan Given accounts and their total.
- `incomeSatang`, `expenseSatang`, `netSatang = income − expense` — **only lines inside the date
  range** when given (inclusive), all time otherwise.
- `categorySpending`: per Expense account `{ id, name, amountSatang }`, highest first, zero rows
  omitted. `incomeBySource` likewise for Income accounts.
- `range`: `{ from, to }` echoed (null when absent).

Balances (cash, debt, loansGiven) are always current (all time); the range affects only the flow
figures. Opening balances, transfers, borrowing, lending and repayments never appear in income or
expenses (BR-08).

### 3. Validation and permissions

`from`/`to` must be valid `YYYY-MM-DD`; `from > to` → 400 `VALIDATION_FAILED`. USER only; ADMIN
→ 403. Only the caller's data is used.

### 4. UI

Overview page: cards **Total cash**, **Credit card & borrowing**, **Loans given**, **Income**,
**Expenses**, **Net**; a list of cash/bank balances; a **Spending by category** table with a
proportional bar; From/To date inputs with **Apply** / **Clear**. Loading, empty ("No income or
expenses in this period.") and error states.

### 5. Acceptance criteria

| AC | Given / When / Then |
|---|---|
| AC-35 | Given the Sprint 1 journey (opening 10,000.00; salary 25,000.00; card purchase 650.00 + 1,200.00; card repayment 1,000.00), the summary shows cash total 34,000.00 (bank), card debt 850.00, income 25,000.00, expenses 1,850.00, net 23,150.00, category spending Groceries 1,200.00 then Dining 650.00. The 1,000.00 repayment and the opening balance are not in income or expenses. |
| AC-36 | With `from`/`to`, income, expenses and category spending include only lines dated inside the range; balances stay current; `from` after `to` or a malformed date → 400. |
| AC-37 | User B's transactions never change user A's summary. |

## Part 2 — F-08 User administration

### 1. Purpose and linked requirements

FR-11, FR-12, BR-20, BR-22, BR-23.

### 2. Behaviour

- `GET /api/admin/users` → 200 `{ "users": [ { id, email, displayName, role, isActive,
  createdAt } ] }` ordered by email. No password hash and **no financial data or counts**.
- `PATCH /api/admin/users/:id` body `{ "isActive": boolean }` → 200 `{ "user": … }`. Disabling
  deletes all the user's sessions in the same DB transaction (BR-23).

### 3. Validation, failure cases and permissions

`isActive` missing or not boolean → 400 `VALIDATION_FAILED`. Unknown or non-numeric id → 404
`NOT_FOUND`. Admin's own id with `isActive: false` → 422 `SELF_DISABLE_FORBIDDEN` (BR-22).
ADMIN only; USER → 403 before anything is loaded.

### 4. UI

Users page (ADMIN): table of e-mail, name, role, status badge (Enabled / Disabled) and a
**Disable** / **Enable** button; the admin's own row shows "You" and no Disable button (the API
still refuses). Busy state per row, error alert on failure.

### 5. Data

Uses `User.isActive` and `Session` — no schema change.

### 6. Acceptance criteria

| AC | Given / When / Then |
|---|---|
| AC-38 | The admin's user list contains every user with only `id, email, displayName, role, isActive, createdAt` — no `passwordHash` and no financial fields. |
| AC-39 | When the admin disables user B, B's live session gets 401 on the next request and B's sign-in returns 401 `INVALID_CREDENTIALS`; after re-enabling, B can sign in again. |
| AC-40 | When the admin disables their own account, 422 `SELF_DISABLE_FORBIDDEN` and they stay enabled. |
| AC-41 | Unknown user id → 404; `isActive` missing or `"no"` → 400. |
| AC-42 | The Users page lists users with status, and pressing Disable on another user changes the badge to Disabled. |

## 7. Test considerations

`summary.test.ts` (unit, pure function) is written first; API tests cover ranges and isolation.
See `sts.md` TEST-41 – TEST-49.

## Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-14 | First contract, before implementation. |
