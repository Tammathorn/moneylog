# F-09 Account management

Contract version 1.0 (2026-11-25) · Issue #40 · Branch `feature/40-account-management`

## 1. Purpose and linked requirements

Users stop depending on the seeded accounts: they create their own financial accounts, rename
them, archive the ones they no longer use, and delete an account only if it was never used.
FR-13, FR-14, BR-16, BR-17, BR-21 (ownership), NFR-06 (error shape).

## 2. Behaviour and workflow

1. **Create.** On **Accounts** the user presses **New account**, enters a name, picks a type
   and (for Cash and Loan accounts) a subtype, and saves. The account appears in its type group
   with balance ฿0.00 and can be used in new transactions at once.
2. **Rename.** **Rename** on a row opens an inline name field. The new name is shown everywhere
   (history, detail, summary) because those screens read the name from the account row.
3. **Archive / Restore.** **Archive** moves the account to an **Archived** section. Its balance
   and history stay and still count in balances and the summary (BR-16). It is no longer
   offered in New transaction and the API refuses it in a new transaction or opening balance.
   **Restore** makes it active again.
4. **Delete.** **Delete** is accepted only for an account that has never been used as a header or
   line account (BR-17); otherwise the API answers `ACCOUNT_IN_USE` and the UI tells the user to
   archive instead.
5. **Change type.** The type and subtype can be changed only while the account is unused and has
   no opening balance (BR-17); after that they are locked.

## 3. Rules and validation (order of checks)

| Step | Check | Failure |
|---|---|---|
| 1 | Path id is a positive integer and the account belongs to the caller | 404 `NOT_FOUND` (same as a missing id) |
| 2 | `name` string, trimmed 1–60 characters | 400 `VALIDATION_FAILED`, `fields.name` |
| 3 | `type` ∈ CASH, LOAN_GIVEN, LOAN_TAKEN, INCOME, EXPENSE | 400, `fields.type` |
| 4 | Subtype by type: CASH → WALLET or BANK (required); LOAN_TAKEN → CREDIT_CARD, PERSONAL or OTHER (required); LOAN_GIVEN → PERSONAL or OTHER (default PERSONAL); INCOME/EXPENSE → none (`null`) | 400, `fields.subtype` |
| 5 | PATCH: at least one of `name`, `isActive`, `type`; `isActive` boolean | 400 |
| 6 | Name unique among **all** the caller's accounts (archived included), compared trimmed and case-insensitive | 409 `ACCOUNT_NAME_TAKEN` "You already have an account called …" |
| 7 | Type change on an account that is used or has an opening balance | 422 `ACCOUNT_TYPE_LOCKED` |
| 8 | DELETE on an account used in any transaction (header or line) | 422 `ACCOUNT_IN_USE` "This account has transactions. Archive it instead." |
| 9 | Own archived account in a new transaction (header or line) or in opening balance | 422 `ACCOUNT_ARCHIVED` "… is archived. Restore it or choose another account." |

The rule helpers are pure functions in `server/src/domain/account-rules.ts`
(`parseAccountInput`, `subtypeRule`, `sameName`). Another user's account with the same name is
allowed (names are unique per user, not globally).

## 4. Permissions

`USER` only (ADMIN → 403 `FORBIDDEN_ROLE`, anonymous → 401). Every query is scoped by
`userId = caller.id`; another user's account id gets 404 and is not changed.

## 5. API

| Method and path | Body | Success | Errors |
|---|---|---|---|
| `POST /api/accounts` | `{ "name": "SCB Savings", "type": "CASH", "subtype": "BANK" }` | 201 `{ account: AccountDTO }` | 400, 409 |
| `PATCH /api/accounts/:id` | any of `{ "name", "isActive", "type", "subtype" }` | 200 `{ account: AccountDTO }` | 400, 404, 409, 422 `ACCOUNT_TYPE_LOCKED` |
| `DELETE /api/accounts/:id` | — | 204 | 404, 422 `ACCOUNT_IN_USE` |
| `GET /api/accounts` (unchanged) | — | 200, archived accounts included with `isActive: false` | — |
| `PUT /api/accounts/:id/opening-balance` (changed) | unchanged | unchanged | own archived account → 422 `ACCOUNT_ARCHIVED` (was 404) |
| `POST /api/transactions` (changed) | unchanged | unchanged | own archived account → 422 `ACCOUNT_ARCHIVED` (was `ACCOUNT_NOT_FOUND`) |

AccountDTO is unchanged from Sprint 1 plus `inUse: boolean` (true when any transaction uses
it), so the UI knows whether Delete and Change type make sense.

## 6. UI

Accounts page: **New account** button opens a form (Name, Type, Subtype shown only when the type
has subtypes, Save / Cancel). Each active row: balance, **Set opening balance** (Cash/Loan only),
**Rename**, **Archive**, and **Delete** when `inUse` is false. An **Archived** section lists
archived accounts with balance and **Restore**. Server errors are shown in an alert above the
form; `fields` under the input. New transaction lists only active accounts.

## 7. Data

No migration: `Account.isActive` (archive flag) and unique(userId, name) exist since the `init`
migration. The case-insensitive name check is done in the API (step 6) because the DB unique
index is case-sensitive.

## 8. Acceptance criteria

| AC | Given / When / Then |
|---|---|
| AC-43 | Given user A, when A creates `{name:"SCB Savings", type:CASH, subtype:BANK}`, then 201 with `balanceSatang 0`, `isActive true`, `inUse false`, and `GET /api/accounts` lists it among A's accounts only. |
| AC-44 | Empty or blank name, a 61-character name, unknown type, CASH without subtype, CASH with CREDIT_CARD, INCOME with a subtype → 400 `VALIDATION_FAILED` with the field named; a 60-character name is accepted. Nothing is created. |
| AC-45 | When A creates or renames to `" kbank savings "` while "KBank Savings" exists (active or archived), then 409 `ACCOUNT_NAME_TAKEN`; when B creates "KBank Savings", 201. |
| AC-46 | When A renames KBank Savings to "KBank Main", then 200 and the history/detail of earlier transactions show "KBank Main"; renaming B's account id → 404 and B's name is unchanged. |
| AC-47 | When A archives KBank Savings, then its balance is unchanged and it still counts in the summary; a new transaction with it as header or line → 422 `ACCOUNT_ARCHIVED` with no rows added; opening balance on it → 422 `ACCOUNT_ARCHIVED`; after Restore the same transaction is accepted. |
| AC-48 | DELETE on an unused account → 204 and it is gone; on an account used as header or line → 422 `ACCOUNT_IN_USE` and the account and its transactions remain; on B's id → 404. |
| AC-49 | Changing type/subtype of an unused account without opening balance → 200; of a used account or one with an opening balance → 422 `ACCOUNT_TYPE_LOCKED` and the type is unchanged. |
| AC-50 | In the UI, creating an account adds it to its type group; Archive moves it to Archived with Restore; an archived account is not offered in New transaction. |

## 9. Test considerations

Name and subtype rules are unit-tested first (TDD) in `server/tests/unit/account-rules.test.ts`;
persistence, uniqueness, archive effects and ownership in `server/tests/api/account-management.api.test.ts`;
UI in `client/tests/Accounts.test.tsx`. See `sts.md` TEST-60 – TEST-67.

## Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-25 | First contract, before implementation. |
