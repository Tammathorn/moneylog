# F-15 Monthly reports

Contract version 1.0 (2026-11-26) · Planned for Deliverable 3 · FR-20, BR-13, BR-21

## 1. Behaviour

The user opens **Reports**, picks a year (default: this year in Asia/Bangkok) and sees one row
per month: income, expenses, net, and the top three expense categories, plus a year total.
Clicking a month opens History filtered to that month (F-11 `from`/`to`).

## 2. Rules

Month boundaries use the transaction `date` (Asia/Bangkok calendar, BR-11). Income and expense
are the same line sums as the F-07 summary for that month's range, so a month's figure equals
`GET /api/summary?from=YYYY-MM-01&to=<last day>`. Year must be 2000 … current year (400 otherwise).

## 3. API and UI

`GET /api/reports/monthly?year=2026` → `{ year, months: [{ month: "2026-01", incomeSatang, expenseSatang, netSatang, topCategories: [{ id, name, amountSatang }] }], total: { … } }`.
User only (Admin 403). Page `client/src/pages/Reports.tsx` with a table and a simple bar per month.
No migration.

## 4. Acceptance criteria (planned)

| AC | Given / When / Then |
|---|---|
| AC-82 | For a year with transactions in Jan and Nov, each month's income/expense equals the summary for that month; empty months show 0.00; the year total equals the sum of months. |
| AC-83 | A transaction dated 31 Jan counts in January, 1 Feb in February (calendar dates, no time-zone shift). |
| AC-84 | `year=1999`, `year=abc`, a future year → 400; Admin → 403; another user's data never counted. |
| AC-85 | Clicking a month opens History with that month's from/to filter. |

Tests planned: unit `monthlyReport()`; API report vs summary per month; UI table.
