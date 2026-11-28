# F-11 History search, filter and pagination

Contract version 1.0 (2026-11-25) · Issue #42 · Branch `feature/42-history-filter`

## 1. Purpose and linked requirements

Users find past records quickly: by date range, account, kind, text and amount, plus
favourites, with pages instead of one long list. FR-16, FR-17 (favourites view), BR-15, BR-21.

## 2. Behaviour and workflow

1. History shows a filter bar: From, To, Account (all of the user's accounts, archived
   included and marked), Kind (Any / Payment / Money received), Text, Min ฿, Max ฿, and
   **Favourites only**.
2. **Apply** puts the filters in the page URL (so Back/refresh keep them) and loads page 1.
   **Clear** removes them.
3. The list shows "Showing 1–50 of N" with **Previous** / **Next**. With no match:
   "No transactions match these filters."
4. All filters are combined with AND and run in the database, scoped to the caller.

## 3. Rules and validation

| Parameter | Meaning | Invalid → 400 `VALIDATION_FAILED` |
|---|---|---|
| `from`, `to` | Transaction date inclusive (YYYY-MM-DD) | not a real date; `from` after `to` (`fields.from`) |
| `accountId` | Header account **or** any line account equals the id | not a positive integer |
| `kind` | PAYMENT or RECEIPT | any other value |
| `q` | Case-insensitive substring of the description or any line note | longer than 100 characters |
| `minSatang`, `maxSatang` | Inclusive bounds on `totalSatang` | not an integer 0 … 1,000,000,000; min > max |
| `favourite` | `true` = favourites only | not `true`/`false` |
| `limit`, `offset` | Page size 1–100 (default 50), offset ≥ 0 | clamped, as in Sprint 1 |

Parsing is the pure function `parseHistoryFilter(query)` in `server/src/domain/history-filter.ts`,
which returns either field errors or a filter object; the route turns the object into a Prisma
`where` that **always** starts with `userId = caller.id`. An `accountId` of another user's
account simply matches nothing.

## 4. Permissions

`USER` only (ADMIN 403, anonymous 401). Results never include another user's transactions,
whatever the filters (BR-21).

## 5. API

`GET /api/transactions?from=2026-11-01&to=2026-11-30&accountId=5&kind=PAYMENT&q=central&minSatang=10000&maxSatang=500000&favourite=true&limit=50&offset=0`
→ 200 `{ "items": TransactionDTO[], "total": <matching count> }`, ordered date desc, created
desc, id desc (unchanged from AC-32).

## 6. UI

`client/src/pages/History.tsx` filter form (labels on every input, amounts typed as THB and
converted with `parseThb`), result summary, pager. Client-side checks only help (e.g. disable
Apply while Min > Max); the API is the authority.

## 7. Data

No migration. The existing index (userId, date) serves the default order and date ranges.

## 8. Acceptance criteria

| AC | Given / When / Then |
|---|---|
| AC-58 | Given A's five known transactions, each filter alone (date range, accountId as header, accountId as line, kind, q in description, q in a line note, min/max total, favourite) returns exactly the expected ids in AC-32 order, and `total` equals that count; two filters together are combined with AND. |
| AC-59 | `from=2026-02-30`, `from` after `to`, `minSatang=-1`, `minSatang=1.5`, min > max, `kind=OTHER`, `accountId=abc`, `favourite=yes`, a 101-character `q` → 400 with the field named. |
| AC-60 | B's transactions never appear for A whatever the filters, and `accountId` = one of B's accounts returns 0 items for A. |
| AC-61 | With 5 matching items, `limit=2&offset=2` returns the 3rd and 4th items and `total` 5. |
| AC-62 | In the UI, Apply sends the filters and shows "Showing 1–N of total"; Next/Previous change the page; Clear resets; no match shows "No transactions match these filters." |

## 9. Test considerations

`parseHistoryFilter` is unit-tested first (TDD) in `server/tests/unit/history-filter.test.ts`;
queries against real PostgreSQL in `server/tests/api/history-filter.api.test.ts`; UI in
`client/tests/History.test.tsx`. See `sts.md` TEST-81 – TEST-86.

## Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-25 | First contract, before implementation. |
