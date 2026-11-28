# MoneyLog — Sprint 1 UAT Plan and Handoff (Lab 6, Part A)

Version 1.0 (2026-11-25). Product Team: Tammathorn Kananurak (67070503489) and Chakriwat Srivilai (67070503407).
Theme 7: Personal Money and Expense Logging System. Repository: https://github.com/Tammathorn/moneylog

## 1. What is being tested

| Item | Value |
|---|---|
| Accepted-for-test scope | Sprint 1 only: F-01 to F-08 (sign-in and sign-out, access control, accounts and balances, opening balance, record transaction, history and detail, financial summary, admin enable/disable). Sprint 2 and 3 features are not part of this acceptance. |
| Sprint 1 baseline | Tag `v0.1.0` = commit `088148a` (Deliverable 1). |
| Deployed version under test | `main` @ `d0a1304`, Cloud Run revision `moneylog-00006-6qc`. |
| Difference from baseline | Lab 5 operations only: `/api/health`, `/api/ready`, `/api/version`, the footer release label, the production seed and the proxy-aware Origin check. No Sprint 1 rule, screen or API contract changed. |
| URL | https://moneylog-73939023981.asia-southeast1.run.app |
| Check the version first | Open `/api/version` and check that `commit` starts with `d0a1304`; the page footer shows `release d0a1304`. If it shows another commit, stop and tell the Product Team. |
| Contract | Sprint 1 contracts in `docs/sprints/sprint-1/` (AC-01 to AC-42), summarised in each case below. |

The Product Team will not deploy to this URL during the agreed UAT window without telling the UAT Team first.

## 2. Accounts (passwords are given privately, never in this document)

| Label | E-mail | Role | State |
|---|---|---|---|
| U1 | `alice@moneylog.test` | User | Enabled |
| U2 | `bob@moneylog.test` | User | Enabled |
| U3 | `dave@moneylog.test` | User | Disabled (on purpose) |
| A1 | `admin@moneylog.test` | Administrator | Enabled |

Each user has the same ten seeded accounts: KBank Savings (bank), Wallet (wallet), KTC Credit Card (credit card),
Loan to Beam (loan given), Salary and Interest (income), Dining, Groceries, Electricity and Telecom (expense).
All data is synthetic.

## 3. Data setup, sequence and cleanup

- Sprint 1 has no edit or delete, so data stays after each run. Every expected balance is written as
  **"value before + change"**: write down the value before you start, then check the change.
- Start every description with `UAT-` and the case ID so your records are easy to find.
- Run order: UAT-01 → UAT-02 → UAT-05 (UAT-05 uses the records from UAT-01). UAT-03, UAT-04, UAT-06 and UAT-07 are independent.
- UAT-06 disables U2 and then enables U2 again. Finish the case so U2 is enabled at the end.
- Cleanup: none needed. If U2 is left disabled, sign in as A1 and press **Enable** next to `bob@moneylog.test`.
- Amounts are Thai baht with two decimals. "Owed" on the card means the debt.

## 4. UAT cases

### UAT-01 — Normal journey: salary, split card purchase, card repayment
- **Category:** normal domain journey. **Refs:** FR-06, FR-07, FR-08, FR-10; AC-21, AC-22, AC-23, AC-24, AC-35.
- **Purpose:** money moves between the right accounts, and income and expenses are counted correctly.
- **Role / account:** U1 (alice). **Precondition:** U1 is enabled.
- **Steps:**
  1. Sign in as U1. Open **Accounts** and write down the balances of KBank Savings, KTC Credit Card, Salary, Dining and Groceries.
     Open **Overview** and write down Income, Expenses and Net (no date range).
  2. **New transaction** → Money received, into **KBank Savings**, today, total `25000.00`, description `UAT-01 salary`,
     one line: Salary `25000.00`. Save.
  3. **New transaction** → Payment / charge, from **KTC Credit Card**, today, total `1850.00`, description `UAT-01 card purchase`,
     lines: Dining `650.00` and Groceries `1200.00`. Save.
  4. **New transaction** → Payment / charge, from **KBank Savings**, today, total `1000.00`, description `UAT-01 card repayment`,
     one line: KTC Credit Card `1000.00`. Save.
  5. Open **Accounts** and **Overview** again.
- **Expected results:**
  - KBank Savings = before + 25,000.00 − 1,000.00 = **before + 24,000.00**.
  - KTC Credit Card owed = before + 1,850.00 − 1,000.00 = **before + 850.00**.
  - Salary = before + 25,000.00; Dining = before + 650.00; Groceries = before + 1,200.00.
  - Overview: Income = before + **25,000.00**; Expenses = before + **1,850.00** (the 1,000.00 repayment is not an expense);
    Net = before + **23,150.00**.
  - Each save shows a "Transaction saved" confirmation.

### UAT-02 — Business rule and boundary: lines must add up to the total
- **Category:** business rule / boundary. **Refs:** BR-01, BR-04; AC-25, AC-28, AC-31.
- **Role:** U1. **Precondition:** signed in as U1. Write down the number of rows on **History**.
- **Steps:**
  1. New transaction → Payment / charge from KTC Credit Card, today, total `1850.00`, lines Dining `650.00` and Groceries `1199.99`.
  2. Look at Allocated, Remaining and the **Save transaction** button.
  3. Change Groceries to `1200.00` and look again. Do **not** save; leave the page.
  4. Start again with total `12.345` (three decimals) and one Dining line `12.345`.
  5. Open **History**.
- **Expected results:**
  - Step 2: Allocated ฿1,849.99, Remaining **฿0.01** shown as an error (red), and **Save transaction is disabled**.
  - Step 3: Remaining ฿0.00 and Save becomes enabled (proves the boundary is exact to one satang).
  - Step 4: the amount is not accepted (Save stays disabled), because only 0–2 decimals are allowed.
  - Step 5: the History row count is the same as before (nothing was saved).

### UAT-03 — Opening balance rules
- **Category:** business rule / boundary. **Refs:** FR-05, BR-06, BR-09; AC-18, AC-19.
- **Role:** U2 (bob). **Precondition:** signed in as U2.
- **Steps:**
  1. Open **Accounts**. Write down the Wallet balance and its current opening amount (shown under the name, if any).
  2. Press **Set opening balance** on Wallet, enter `500.00` with date `2026-11-01`, and save.
  3. Check whether Salary or Dining (income/expense) offer **Set opening balance**.
- **Expected results:**
  - Wallet shows "Opening ฿500.00 on 2026-11-01" and its balance = before − old opening (0 if none) + **500.00**.
  - Income and expense accounts have **no** opening-balance action (opening balances only apply to cash and loan accounts).

### UAT-04 — Forbidden role and ownership
- **Category:** forbidden role / ownership. **Refs:** BR-20, BR-21, NFR-01; AC-09, AC-10, AC-11, AC-29, AC-33.
- **Roles:** U1, U2, A1. **Precondition:** UAT-01 done, so U1 has transactions.
- **Steps:**
  1. As U1 open **History**, open the `UAT-01 salary` row and write down the number at the end of the address (`/transactions/<id>`). Sign out.
  2. Sign in as U2. Type `<URL>/transactions/<id>` (U1's id) in the address bar.
  3. As U2 type `<URL>/api/transactions/<id>` in the address bar.
  4. As U2 open `<URL>/admin/users`, then `<URL>/api/admin/users`. Sign out.
  5. Sign in as A1. Note where you land. Then open `<URL>/api/accounts`, `<URL>/api/summary` and `<URL>/api/transactions`.
  6. Sign out and open `<URL>/api/accounts` while signed out.
- **Expected results:**
  - Step 2: the page shows "That record was not found." and **none** of U1's amounts, accounts or description.
  - Step 3: `{"error":{"code":"NOT_FOUND","message":"That record was not found."}}` — the same as for an id that does not exist.
  - Step 4: the page says "This page is not available for your role."; the API returns `403` with `FORBIDDEN_ROLE`.
  - Step 5: A1 lands on **Users** (no money menus). Each financial API returns `{"error":{"code":"FORBIDDEN_ROLE",…}}` and **no** financial data.
  - Step 6: `{"error":{"code":"AUTH_REQUIRED",…}}`.
  - U1's data is unchanged afterwards (check U1's History if you want).

### UAT-05 — History, detail and persistence after sign-out
- **Category:** state / history / persistence. **Refs:** FR-09, FR-10, NFR-08; AC-32, AC-33, AC-34, AC-36.
- **Role:** U1. **Precondition:** UAT-01 done.
- **Steps:**
  1. Sign out completely and close the tab. Open the URL again and sign in as U1.
  2. Open **History**.
  3. Open `UAT-01 card purchase`.
  4. On **Overview** set From and To to today's date and press **Apply**. Then press **Clear**.
- **Expected results:**
  - Step 2: the three UAT-01 records are listed, newest first, with the right kind and totals (25,000.00, 1,850.00, 1,000.00).
  - Step 3: detail shows Paid from KTC Credit Card, total ฿1,850.00, lines Dining ฿650.00 and Groceries ฿1,200.00.
  - Step 4: with today's range, Income and Expenses include only today's lines (at least 25,000.00 and 1,850.00 from UAT-01);
    the account balances stay the same with or without the range.
  - The balances from UAT-01 are still the same after signing in again (the data is stored in the database, not the browser).

### UAT-06 — Administrator disables and enables a user
- **Category:** forbidden role / state. **Refs:** FR-11, FR-12, BR-22, BR-23; AC-38, AC-39, AC-42.
- **Roles:** A1 and U2 (use two browsers, or one normal and one private window).
- **Steps:**
  1. Window 1: sign in as U2 and stay on **Overview**.
  2. Window 2: sign in as A1. On **Users**, check the columns, then press **Disable** on `bob@moneylog.test`.
  3. Window 1: reload the page.
  4. Window 1: try to sign in as U2 again with the right password.
  5. Window 2: press **Enable** on `bob@moneylog.test`. Window 1: sign in as U2.
  6. Window 2: look at A1's own row.
- **Expected results:**
  - Step 2: the list shows e-mail, name, role and status only (no money). Bob's badge changes to **Disabled**.
  - Step 3: U2 is sent to the sign-in page (the session ended).
  - Step 4: "E-mail or password is incorrect." — the same message as a wrong password.
  - Step 5: U2 can sign in again.
  - Step 6: A1's own row shows **You** and no Disable button.

### UAT-07 — Sign-in errors do not reveal which accounts exist
- **Category:** forbidden role / boundary. **Refs:** FR-01, BR-23, BR-24; AC-02, AC-08.
- **Steps:**
  1. Sign in as U1 with a wrong password.
  2. Sign in as `nobody@moneylog.test` with any password.
  3. Sign in as U3 (dave, disabled) with the right password.
  4. Sign in as U1 with the right password.
- **Expected results:**
  - Steps 1–3: the same message every time: **"E-mail or password is incorrect."**, and you stay on the sign-in page.
  - Step 4: U1 lands on **Overview** with "Alice Chaiyo" in the top bar.

## 5. Coverage of the Sprint 1 acceptance criteria

| Sprint 1 area | AC | UAT case | Covered only by automated tests (reason) |
|---|---|---|---|
| Sign-in and sign-out | AC-01–AC-08 | UAT-05, UAT-07 | AC-06 expired session, AC-07 hashing (not visible to a user) |
| Access control | AC-09–AC-13 | UAT-04 | AC-12 cross-site Origin, AC-13 500 shape (need crafted requests) |
| Accounts and opening balance | AC-14–AC-20 | UAT-01, UAT-03, UAT-04 | AC-20 another user's account id (needs a crafted PUT) |
| Record transaction | AC-21–AC-31 | UAT-01, UAT-02 | AC-26/27/29/30 (blocked by the form; covered by API tests TEST-30–TEST-36) |
| History and detail | AC-32–AC-34 | UAT-04, UAT-05 | — |
| Summary | AC-35–AC-37 | UAT-01, UAT-05 | — |
| Admin | AC-38–AC-42 | UAT-06 | AC-40 self-disable via API (the UI hides the button, checked in UAT-06 step 6), AC-41 |

## 6. How to report a finding

Open a GitHub Issue in https://github.com/Tammathorn/moneylog with the label `uat` (or send it in the agreed chat and we will
open it for you). Include: case ID and step, tester name, date and time, the version from `/api/version`, what you did,
expected result, actual result, a screenshot, and your view of the severity (critical / major / minor).
The Product Team replies on every finding with its classification (accepted defect, duplicate, not a defect, enhancement).
