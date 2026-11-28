# MoneyLog — Software Requirements Specification (SRS)

| Item | Value |
|---|---|
| Product | MoneyLog — Personal Money and Expense Logging System |
| Theme | 7. Personal Money and Expense Logging System (CPE 334 Group Work Specification §6) |
| Team | Tammathorn Kananurak (67070503489, @Tammathorn) · Chakriwat Srivilai (67070503407, @GusGusxz) |
| Version | 3.0 — Sprint 2 complete, Sprint 3 in progress; Lab 7 maintenance revision of BR-09 (see §9 for history and approved revisions) |

## 1. Stakeholder problem and context

Thai university students and early-career staff keep money in several places at once: a bank
account, a cash wallet, a credit card, and informal loans to or from friends. They lose track of
three things: how much cash they really have, how much they owe on the credit card, and where
their money goes each month. Spreadsheets break as soon as one payment is split across several
purposes (one supermarket receipt that is part groceries, part household) or one payment repays
a debt instead of being an expense.

**Chosen context.** A multi-user web application for individuals in Thailand who log their own
money in Thai baht (THB). Each person logs their own records by hand; there is no bank
connection. An operator in the university IT club runs the platform and manages who may sign in,
but has no business seeing anybody's money.

## 2. Actors and responsibilities

| Actor | Role in system | Responsibilities | May NOT |
|---|---|---|---|
| User | `USER` | Signs in; sets opening balances; records payments/charges and money received; reads own balances, debts, summaries and history; manages own accounts; corrects or deletes own transactions; marks favourites and duplicates; reviews loans; changes own password | See or change another user's accounts, transactions or summaries; manage platform users |
| Administrator | `ADMIN` | Signs in; lists platform users; enables or disables user sign-in | See or change any user's financial accounts, transactions, balances or summaries (BR-20); disable their own account (BR-22) |
| Anonymous visitor | none | Can open the sign-in page only | Call any protected endpoint (NFR-01) |

One account has exactly one role (Group Work Specification §5.2).

## 3. Product scope

### 3.1 In scope (whole product, Sprints 1–3)

- Sign-in, sign-out and current-user identity with server-side sessions; two roles.
- Five financial account types: **Cash** (wallets, bank accounts), **Loan Given** (money owed to
  the user), **Loan Taken** (credit cards and other borrowing), **Income** and **Expense**
  (categories).
- Opening balances for Cash, Loan Given and Loan Taken accounts.
- Two transaction forms, each with a date, a total and one or more allocation lines:
  **Payment / charge** and **Money received**.
- Derived balances, outstanding loans, credit-card debt, income/expense summaries, category
  spending and transaction history.
- Account management, transaction correction, search/filter, favourites and Duplicate, reports
  (Sprints 2–3).
- Administrator user enable/disable.

### 3.2 Explicit exclusions

Period budgets, shared budgets, automatic recurring transactions, bank or card integration, real
payment, multiple currencies, foreign-exchange, interest calculation, tax advice, file import,
self-registration, password recovery, e-mail verification, multiple roles per account, mobile
native apps. Administrators never read financial data, including in "support" situations.

## 4. Functional requirements (FR)

IDs are stable. "Sprint" is the planned sprint (see `docs/traceability.md`).

| ID | Requirement (observable behaviour) | Sprint |
|---|---|---|
| FR-01 | A visitor signs in with e-mail and password. On success the system creates a session and shows the user's home screen for their role. | 1 |
| FR-02 | A signed-in person signs out; the session ends on the server and any further request with that session is refused with 401. | 1 |
| FR-03 | A signed-in person can retrieve their own identity (id, display name, e-mail, role) from the server. | 1 |
| FR-04 | A User sees a list of their own financial accounts grouped by type, each with its current balance. | 1 |
| FR-05 | A User sets the opening balance and opening date of one of their Cash, Loan Given or Loan Taken accounts. | 1 |
| FR-06 | A User records a **Payment / charge**: chooses the paying account (Cash or Loan Taken), a date, a total, an optional description and 1–20 allocation lines to Expense, Loan Taken (repayment), Loan Given (lending) or Cash (transfer out) accounts. | 1 |
| FR-07 | A User records **Money received**: chooses the receiving Cash account, a date, a total, an optional description and 1–20 allocation lines to Income, Loan Given (repayment received), Loan Taken (new borrowing) or Cash (transfer in) accounts. | 1 |
| FR-08 | After a transaction is saved, every affected account balance reflects it immediately. | 1 |
| FR-09 | A User sees their transaction history, newest first, and opens a transaction to see its lines. | 1 |
| FR-10 | A User sees a financial summary: total cash, each cash/bank balance, outstanding credit-card and other borrowing, outstanding loans given, total income, total expenses, net (income − expenses) and spending per expense category, optionally for a date range. | 1 |
| FR-11 | An Administrator lists platform user accounts (name, e-mail, role, enabled). | 1 |
| FR-12 | An Administrator enables or disables a user's sign-in. | 1 |
| FR-13 | A User creates a financial account of any of the five types (name, type, subtype: required for Cash and Loan Taken, optional for Loan Given, none for Income/Expense). *Rev. 2.0: subtype rule made explicit.* | 2 |
| FR-14 | A User renames or archives an account; an archived account keeps its history but cannot be used in new transactions. | 2 |
| FR-15 | A User corrects a transaction (edit date, description, total, lines) or deletes it; balances are recomputed. | 2 |
| FR-16 | A User searches and filters history by date range, account, kind, text and amount. | 2 |
| FR-17 | A User marks/unmarks a transaction as a favourite and views favourites. | 2 |
| FR-18 | A User selects **Duplicate** on a transaction to open a new, editable, unsaved transaction with the same details (date defaults to today). | 2 |
| FR-19 | A User sees outstanding loans per person (Loan Given) and per lender/card (Loan Taken) with their repayment history. | 2 |
| FR-20 | A User sees a monthly report: income, expenses and category spending per month for a chosen year. | 3 |
| FR-21 | An Administrator creates a user account with a temporary password; the user must change it at first sign-in. | 3 |
| FR-22 | A User changes their own password. | 3 |

## 5. Business rules (BR)

Money is THB with two decimals, stored as integer **satang** (1 THB = 100 satang).

| ID | Rule | Sprint |
|---|---|---|
| BR-01 | The sum of a transaction's allocation-line amounts must equal its total exactly; otherwise nothing is saved. | 1 |
| BR-02 | Every total and line amount is > 0, has at most 2 decimal places and is ≤ 10,000,000.00 THB. | 1 |
| BR-03 | A Payment's paying account is a Cash or Loan Taken account. Money received goes into a Cash account. | 1 |
| BR-04 | Payment lines may target Expense, Loan Taken, Loan Given or Cash accounts. Receipt lines may target Income, Loan Given, Loan Taken or Cash accounts. Any other type is rejected. | 1 |
| BR-05 | A line may not target the transaction's own paying/receiving account, and one account may appear at most once per transaction. A transaction has 1–20 lines. | 1 |
| BR-06 | Every account referenced by a transaction or opening balance must belong to the signed-in user and be active. An account of another user is treated exactly like a non-existent one. *Rev. 2.0: an own archived account is refused with `ACCOUNT_ARCHIVED`; when correcting a transaction, archived accounts already on it may stay (D-12).* | 1 |
| BR-07 | Balance effects (amount *a*). **Payment** from Cash: paying −*a*; from Loan Taken: paying +*a* (debt grows). Payment lines: Expense +*a*, Loan Taken −*a* (repaid), Loan Given +*a* (lent), Cash +*a* (transfer in). **Receipt** into Cash: receiving +*a*. Receipt lines: Income +*a*, Loan Given −*a* (repaid to user), Loan Taken +*a* (borrowed), Cash −*a* (transfer out). Balance = opening balance + Σ effects. | 1 |
| BR-08 | Only lines to Income accounts count as income and only lines to Expense accounts count as expenses. Transfers, borrowing, loan repayments, lending and opening balances are never income or expenses. | 1 |
| BR-09 | Opening balances apply only to Cash, Loan Given and Loan Taken accounts, are ≥ 0.00 and ≤ 10,000,000.00 THB, and have an opening date. Setting it again replaces the previous value. *Rev. 3.0 (Lab 7, CR-L7-01, #64): a **Cash** opening balance is from −10,000,000.00 to 10,000,000.00 THB (negative = started overdrawn); Loan Given / Loan Taken stay 0.00 to 10,000,000.00 THB (D-18).* | 1 |
| BR-10 | A transaction date is a calendar date (YYYY-MM-DD) from 2000-01-01 up to today in Asia/Bangkok; future dates are rejected. | 1 |
| BR-11 | Description is optional, trimmed, ≤ 200 characters. Line note is optional, ≤ 100 characters. | 1 |
| BR-12 | A transaction and all its lines are saved atomically: either all rows exist or none. | 1 |
| BR-13 | Balances are derived from opening balances and saved lines, not stored separately, so a balance can never disagree with history. | 1 |
| BR-14 | A Cash balance may go below zero (the person may have logged out of order); the UI marks it as negative instead of rejecting the record. | 1 |
| BR-15 | History is ordered by transaction date descending, then creation time descending. | 1 |
| BR-16 | An archived account cannot be chosen in a new transaction but still appears in history and summaries. | 2 |
| BR-17 | An account with transactions cannot be deleted, only archived. Its type cannot change once used or once it has an opening balance. *Rev. 2.0: opening balance added to the lock (D-14).* | 2 |
| BR-18 | A Duplicate is not saved until the user submits it; it is validated as a new transaction. | 2 |
| BR-19 | Favourite is a per-transaction flag visible only to the owner. | 2 |
| BR-20 | An Administrator may not read or change any financial account, transaction, balance or summary — through any endpoint. | 1 |
| BR-21 | A User may operate only on their own records; users never see each other's records. | 1 |
| BR-22 | An Administrator may not disable their own account, so the platform always keeps one enabled administrator. | 1 |
| BR-23 | A disabled user cannot sign in, and their existing sessions stop working on the next request. | 1 |
| BR-24 | Sign-in failure gives the same message for unknown e-mail, wrong password and disabled account. | 1 |

## 6. Non-functional requirements (NFR)

| ID | Requirement and measurable target | Verification method | Sprint established / verified |
|---|---|---|---|
| NFR-01 | Every protected endpoint refuses an unauthenticated request with 401 and returns no private data. | API test over all protected routes | 1 / 1 |
| NFR-02 | Passwords are stored only as salted scrypt hashes; no API response contains a password or hash. | DB test + API response assertions | 1 / 1 |
| NFR-03 | Sessions use a random 256-bit token in an HttpOnly, SameSite=Strict cookie; the DB stores only its SHA-256; absolute expiry 8 h; sign-out deletes the session row. | Unit + API tests | 1 / 1 |
| NFR-04 | All money arithmetic is exact (integer satang); 0.10 + 0.20 is 0.30 exactly. | Unit tests | 1 / 1 |
| NFR-05 | A failed transaction save leaves no partial rows (atomicity). | DB integration test | 1 / 1 |
| NFR-06 | Errors return `{ error: { code, message } }` with no stack trace, SQL or internal path. | API tests on 4xx/5xx | 1 / 1 |
| NFR-07 | No real secret is committed; all configuration comes from environment variables documented in `.env.example`. | Review checklist; GitHub secret scanning (Lab 5) | 1 / 2 |
| NFR-08 | Data survives an application restart and redeploy (durable PostgreSQL). | Restart check locally (S1); GCP restart/redeploy check (Lab 5) | 1 / 2 |
| NFR-09 | The application is packaged as one Docker image and deployed to GCP (Cloud Run + Cloud SQL) from `main` by a pipeline. | Lab 5 pipeline run | 2 / 2 |
| NFR-10 | Summary and history for a user with 2,000 transactions respond in < 500 ms (p95, 50 requests) on the reference laptop. | Perf smoke script | 1 (design) / 3 |
| NFR-11 | Screens are usable at 390 px, 834 px and 1280 px widths; text contrast ≥ 4.5:1 (WCAG 2.1 AA); all controls reachable by keyboard. | Playwright screenshots + checklist | 1 (design) / 3 |
| NFR-12 | Sign-in attempts are limited to 10 per e-mail per 15 minutes (429 afterwards). | API test | 3 / 3 |

## 7. Assumptions

| ID | Assumption |
|---|---|
| AS-01 | One currency (THB); amounts are entered with up to two decimals. |
| AS-02 | "Today" is evaluated in Asia/Bangkok, the users' time zone. |
| AS-03 | Seeded demo accounts are enough in Sprint 1; users do not create their own financial accounts until Sprint 2 (stakeholder brief "Later sprints"). *Closed in 2.0: F-09 delivered.* |
| AS-04 | Users log their own data; there is no shared household data. |
| AS-05 | Loan Given / Loan Taken accounts are created per counterparty (e.g. "Loan to Beam", "KBank credit card"). |

## 8. Decisions and resolved questions

| ID | Question | Decision and reason | Date |
|---|---|---|---|
| D-01 | Theme choice between 9 (Queue) and 7 (Money)? | Theme 7, Chakriwat's ID digit; the team preferred a domain with real calculation rules. | 2026-11-14 |
| D-02 | Store balances or derive them? | Derive from opening balance + lines (BR-13). No lost update under concurrent saves, and correction (FR-15) needs no balance rewrite. NFR-10 keeps this honest. | 2026-11-14 |
| D-03 | How to represent money? | Integer satang in the DB and API (`amountSatang`), formatted only in the UI (NFR-04). | 2026-11-14 |
| D-04 | Does the user type the total, or is it the sum of lines? | The user types the total and the lines; the server rejects a mismatch (BR-01). The form shows the remaining amount live. It is the stakeholder's rule and catches typing errors. | 2026-11-14 |
| D-05 | Can a cash balance go negative? | Yes, flagged in the UI (BR-14). Rejecting would block truthful logging when records are entered out of order. | 2026-11-14 |
| D-06 | Is a credit-card purchase an expense on the card? | Yes: Payment from the Loan Taken (card) account with Expense lines — debt rises, expense recorded. Repaying the card is a Payment from the bank with a Loan Taken line — not an expense (BR-08). | 2026-11-14 |
| D-07 | What does an Administrator see for a user? | Name, e-mail, role, enabled flag, created date. Never counts or totals of financial data (BR-20). Financial routes refuse the ADMIN role with 403. | 2026-11-14 |
| D-08 | Session or JWT? | Server-side session rows with an opaque cookie token (NFR-03). Sign-out and disable take effect immediately (BR-23), which a stateless JWT cannot do without a deny-list. Same design proven in TokTickIT. | 2026-11-14 |
| D-09 | Can opening balance be negative? | No (BR-09). A Cash overdraft is rare for the users; Loan balances are "amount owed", always ≥ 0. Revisit in Sprint 2 if UAT disagrees. *Superseded for Cash by D-18 (rev. 3.0); unchanged for loans.* | 2026-11-14 |
| D-10 | Is the opening date enforced against transaction dates? | Not in Sprint 1: the opening balance is the account's starting point regardless of date. Sprint 2 (FR-14 work) decides whether earlier transactions should warn. Recorded as open question Q-01. | 2026-11-14 |
| D-11 | Another user's account id in a request? | Treated as non-existent: 422 `ACCOUNT_NOT_FOUND` for body references, 404 for path ids (BR-06). This does not reveal that the id exists. | 2026-11-14 |

| D-12 | Can a correction keep an account that was archived after the transaction was saved? | Yes. Otherwise old records could never be fixed; a *different* archived account is still refused (BR-06, BR-16). | 2026-11-25 |
| D-13 | Are account names unique? | Per user, trimmed and case-insensitive, archived accounts included, so "KBank" and "kbank " cannot both exist and a restore never collides. | 2026-11-25 |
| D-14 | When is the type locked? | Once any transaction uses the account **or** an opening balance is set, because an opening balance means different things for different types (BR-09, BR-17). | 2026-11-25 |
| D-15 | Delete or soft-delete a transaction? | Hard delete of header and lines after an explicit confirmation; balances are derived, so nothing else needs updating (D-02). A history of edits is out of scope. | 2026-11-25 |
| D-16 | Q-01: a transaction dated before the opening date? | Allowed without warning: the opening balance is the starting point the user chose, and loans/cards are often entered after the fact. Revisit only if UAT reports confusion. | 2026-11-26 |
| D-17 | Who may change a password, and what happens to other sessions? | Each user changes only their own (no user id in the request); other sessions end at once, the current one stays (FR-22, BR-23 spirit). | 2026-11-26 |
| D-18 | Lab 7 (CR-L7-01, #64): may a Cash opening balance be negative? | Yes, from −10,000,000.00 to 10,000,000.00 THB. A user who starts with an overdrawn bank or e-wallet account must be able to record the true starting point; Cash balances may already go below zero (BR-14, D-05). Loan balances are "amount owed" and stay ≥ 0. Enforced in the API by account type and in the database by a type-aware CHECK (new migration). | 2026-11-28 |

**Open questions:** none (Q-01 resolved by D-16).

## 9. Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-14 | Sprint 1 baseline. |
| 3.0 | 2026-11-28 | Lab 7 maintenance change CR-L7-01 (#64): BR-09 allows a negative Cash opening balance down to −10,000,000.00 THB; loans unchanged; D-09 superseded for Cash by D-18. Reviewed by the teammate on the contract PR before implementation. |
| 2.0 | 2026-11-26 | Sprint 2 revision (approved by both students in PR review): FR-13 subtype rule explicit; BR-06 archived-account code and edit exception; BR-17 lock includes opening balance; decisions D-12–D-17; Q-01 resolved; AS-03 closed. No requirement removed or moved between sprints. |
