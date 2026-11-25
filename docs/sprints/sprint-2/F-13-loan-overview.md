# F-13 Loan overview

Contract version 1.0 (2026-11-25) · Issue #43 · Branch `feature/43-loan-overview`

## 1. Purpose and linked requirements

Show who owes the user money (Loan Given) and whom the user owes, including credit cards
(Loan Taken), with the full repayment history and a running balance. FR-19, BR-07, BR-13,
BR-16, BR-21.

## 2. Behaviour and workflow

1. The user opens **Loans** in the top menu.
2. Two sections: **Money others owe me** (Loan Given accounts) and **Money I owe** (Loan Taken
   accounts), each with a total.
3. Each loan account shows its outstanding amount and a history: the opening balance (if any)
   and then every transaction that touches the account, oldest first, with the change and the
   running balance. Each row links to the transaction detail.
4. Archived loan accounts are shown (marked "Archived") only while something is still
   outstanding; settled archived loans are hidden.

## 3. Rules

| Rule | Definition |
|---|---|
| Outstanding | The account's derived balance from the balance engine (BR-07): Loan Given = amount still owed to the user; Loan Taken = amount the user still owes. Positive = owed. |
| Change per row | The signed effect of that transaction on this account, from the same BR-07 tables (e.g. Loan Given: Payment line +, Money received line −; Loan Taken: Payment header +, Payment line −, Money received line +). |
| Order and running balance | Opening first (date = openingDate), then by date asc, created asc, id asc; running = previous running + change. The last running balance equals the outstanding. |
| Visibility | Active loan accounts always; archived ones only if outstanding ≠ 0. |

The calculation is the pure function `loanHistory(account, transactions)` in
`server/src/domain/loans.ts`, built on `headerSign`/`lineSign` from `balances.ts`, so the loan page
and the balances can never disagree.

## 4. Permissions

`USER` only (ADMIN 403 `FORBIDDEN_ROLE`, anonymous 401 `AUTH_REQUIRED`). Only the caller's
loan accounts and transactions are read (BR-21).

## 5. API

`GET /api/loans` → 200
```json
{ "given": [ { "account": { "id": 4, "name": "Loan to Beam", "subtype": "PERSONAL", "isActive": true },
               "outstandingSatang": 300000,
               "history": [ { "transactionId": 12, "date": "2026-11-05", "kind": "PAYMENT",
                              "description": "Lent to Beam", "changeSatang": 500000, "runningSatang": 500000 },
                            { "transactionId": 15, "date": "2026-11-20", "kind": "RECEIPT",
                              "description": "Beam paid back", "changeSatang": -200000, "runningSatang": 300000 } ] } ],
  "taken": [ … ], "totalGivenSatang": 300000, "totalTakenSatang": 85000 }
```
The opening row has `transactionId: null`, `kind: "OPENING"`.

## 6. UI

`client/src/pages/Loans.tsx`: two sections with totals, one card per loan (name, subtype,
"Archived" badge, outstanding), and a history table (Date, Description, Change, Balance).
Empty section text: "No loans here."

## 7. Data

No migration. Reads Account and MoneyTransaction/TransactionLine rows of the caller.

## 8. Acceptance criteria

| AC | Given / When / Then |
|---|---|
| AC-68 | Given A lends Beam 5,000.00 (Payment from KBank, line Loan to Beam) and later receives 2,000.00 back (Money received into KBank, line Loan to Beam), and the journey card purchase 1,850.00 and repayment 1,000.00, then `GET /api/loans` shows Loan to Beam outstanding 3,000.00 and KTC Credit Card outstanding 850.00, equal to their `GET /api/accounts` balances; totals 3,000.00 and 850.00. |
| AC-69 | Each history lists the opening (if set) and then the transactions touching the account in date order with the signed change (+5,000.00, −2,000.00) and running balance; the last running balance equals the outstanding. |
| AC-70 | B's loans and transactions never appear in A's response; ADMIN → 403 `FORBIDDEN_ROLE`; anonymous → 401. |
| AC-71 | An archived loan account with outstanding ≠ 0 is listed with `isActive false`; an archived loan with outstanding 0 is not listed. |
| AC-72 | The Loans page shows both sections with totals, each loan's outstanding and history rows; with no loans it shows "No loans here." |

## 9. Test considerations

`loanHistory` is unit-tested first (TDD) in `server/tests/unit/loans.test.ts` (signs, order,
running balance = engine balance); `server/tests/api/loans.api.test.ts` for real data, ownership
and roles; `client/tests/Loans.test.tsx` for the page. See `sts.md` TEST-87 – TEST-91.

## Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-25 | First contract, before implementation. |
