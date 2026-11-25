# F-10 Transaction correction · F-12 Favourites and Duplicate

Contract version 1.0 (2026-11-25) · Issue #41 · Branch `feature/41-correction-favourites`

## 1. Purpose and linked requirements

Users fix mistakes in saved transactions, remove wrong ones, mark frequent transactions as
favourites, and start a new transaction from an old one. Balances are always derived from
the saved rows (BR-13), so an edit or delete changes balances, summary and history at once.
FR-15, FR-17, FR-18, BR-01–BR-07 (re-applied on edit), BR-16, BR-18, BR-19, BR-21, NFR-05.

## 2. Behaviour and workflow

**Edit (F-10).** On a transaction's detail page the user presses **Edit**. The New transaction
form opens pre-filled with the saved kind, account, date, total, description and lines. The
user changes anything and presses **Save changes**. The API validates the whole transaction
again exactly like a new one (F-05 checks 1–5), then replaces the header fields and **all**
lines in one DB transaction. The id, `createdAt` and favourite flag are kept.

**Delete (F-10).** **Delete** on the detail page shows "Delete this transaction? Balances will
be recalculated." with **Confirm delete** and **Cancel**. Confirm deletes the header and its
lines (cascade) and returns to History.

**Favourite (F-12).** A star button on the detail page and on each History row toggles the
favourite flag. History has a **Favourites only** filter (`favourite=true`, see F-11).

**Duplicate (F-12).** **Duplicate** on the detail page opens New transaction pre-filled with the
same kind, account, total, description and lines, with the date set to **today**. Nothing is
saved until the user presses **Save transaction**; it is then validated and saved as a new
transaction (BR-18). If the source used an account that is now archived, that account is left
empty and the form shows "<name> is archived — choose another account."

## 3. Rules and validation

| Step | Check | Failure |
|---|---|---|
| 1 | Path id positive integer, transaction belongs to the caller | 404 `NOT_FOUND` |
| 2 | PUT body: same shape checks as POST (F-05 step 1) | 400 `VALIDATION_FAILED` |
| 3 | Accounts: the caller's **active** accounts, plus archived accounts **already used on this transaction** (so an old record can still be corrected) | another user's / missing → 422 `ACCOUNT_NOT_FOUND`; a different own archived account → 422 `ACCOUNT_ARCHIVED` |
| 4 | F-05 rules: header type, line types, duplicate line account, Σ lines = total | 422 as in F-05 |
| 5 | Favourite body `{ "isFavourite": boolean }` | 400 `VALIDATION_FAILED`, `fields.isFavourite` |

A failed edit changes nothing (the old header and lines stay). The allowed-account set is
built by `editableAccounts()` in `server/src/domain/transaction-rules.ts` (pure, unit-tested).

## 4. Permissions

`USER` only (ADMIN 403, anonymous 401). PUT, DELETE and favourite on another user's
transaction id return 404 exactly like an unknown id, and that transaction is unchanged
(BR-19, BR-21). The favourite flag is part of the owner's transaction and is never returned
to anyone else.

## 5. API

| Method and path | Body | Success | Errors |
|---|---|---|---|
| `PUT /api/transactions/:id` | same as `POST /api/transactions` | 200 `{ transaction }` | 400, 404, 422 |
| `DELETE /api/transactions/:id` | — | 204 | 404 |
| `PUT /api/transactions/:id/favourite` | `{ "isFavourite": true }` | 200 `{ transaction }` | 400, 404 |

TransactionDTO gains `isFavourite: boolean` and `updatedAt` (ISO time of the last edit or
`null`). Duplicate needs no new API: the client reads `GET /api/transactions/:id` and posts a
new transaction.

## 6. UI

Detail page actions: **Edit**, **Duplicate**, **Delete**, and a star toggle
(`aria-pressed`, label "Mark as favourite" / "Remove from favourites"). Edit and Duplicate reuse
the New transaction form (`/transactions/:id/edit`, `/transactions/new?from=:id`); in edit mode
the title is "Edit transaction" and the button "Save changes". The live Remaining check and
error display are the same as F-05 (AC-31).

## 7. Data

Migration `sprint2_transaction_updated_at`: adds nullable `MoneyTransaction.updatedAt`.
`isFavourite` exists since `init`. Lines are replaced with `deleteMany` + `create` inside
`prisma.$transaction`; delete relies on the existing `onDelete: Cascade` from lines.

## 8. Acceptance criteria

Figures: the journey card purchase (KTC Credit Card, Dining 650.00 + Groceries 1,200.00 = 1,850.00).

| AC | Given / When / Then |
|---|---|
| AC-51 | When A edits the card purchase to Dining 650.00 + Groceries 1,000.00 = 1,650.00, then 200; the DB has the same id with exactly those two lines; KTC owed falls by 200.00, Groceries falls by 200.00, expenses fall by 200.00; `createdAt` and `isFavourite` are unchanged and `updatedAt` is set. |
| AC-52 | An edit with lines ≠ total, an Income line on a PAYMENT, a 3-decimal or zero amount, or a future date → the same 400/422 as for a new transaction, and the stored header and lines are exactly as before. |
| AC-53 | After archiving Dining, A can still edit the card purchase that uses Dining (e.g. change the description); replacing a line with another archived account → 422 `ACCOUNT_ARCHIVED`. |
| AC-54 | When A deletes the salary transaction, then 204; its lines are gone; KBank and Salary balances and the summary return to their values before it; `GET` of its id → 404. |
| AC-55 | PUT, DELETE or favourite on B's transaction id, an unknown id or `abc` → 404 `NOT_FOUND`, and B's transaction (fields, lines, flag) is unchanged; ADMIN → 403. |
| AC-56 | If writing the new lines fails inside the DB transaction, the old header and lines remain (no partial edit). |
| AC-57 | In the UI, Edit opens the form pre-filled; Save changes shows the new values on the detail page; Delete asks for confirmation and, after Confirm delete, History no longer lists it. |
| AC-63 | `PUT …/favourite {isFavourite:true}` → 200 and `isFavourite true`; `false` unmarks; `"yes"` or a missing value → 400; B's id → 404 and B's flag unchanged. |
| AC-64 | `GET /api/transactions?favourite=true` returns only the caller's favourites; B marking a favourite never changes A's list. |
| AC-65 | Duplicate opens the form with the source's kind, account, total, description and lines and today's date; the transaction count does not change until Save; after Save there is a new id and the source is unchanged. |
| AC-66 | Duplicating a transaction whose line account is now archived leaves that line's account empty and shows "<name> is archived — choose another account."; forcing the archived id through the API → 422 `ACCOUNT_ARCHIVED`. |
| AC-67 | The star on the detail page and History rows toggles the flag (`aria-pressed`), and **Favourites only** in History shows just the favourites. |

## 9. Test considerations

`editableAccounts()` and the edit check order are unit-tested first (TDD) in
`transaction-rules.test.ts`; persistence, balances after edit/delete, atomicity and ownership in
`server/tests/api/transaction-correction.api.test.ts`; UI in `client/tests/TransactionDetail.test.tsx`
and `NewTransaction.test.tsx`; one E2E edit→delete journey. See `sts.md` TEST-68 – TEST-80.

## Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-25 | First contract, before implementation. |
