# MoneyLog — Feature Inventory

Version 2.0 (2026-11-26). Feature IDs are stable. Requirement IDs are defined in `docs/srs.md`;
the full requirement → feature → sprint → verification table is `docs/traceability.md`.

| ID | Feature | Short description | Requirements | Depends on | Sprint | Status (2026-11-26) |
|---|---|---|---|---|---|---|
| F-01 | Sign-in, sign-out, current user | E-mail/password sign-in, server session cookie, sign-out, `GET /api/auth/me`, role-based home screen | FR-01, FR-02, FR-03, BR-23, BR-24, NFR-02, NFR-03 | — | 1 | Accepted v0.1.0; regression pass |
| F-02 | Access-control foundation *(system responsibility)* | Shared middleware: authentication, role check, owner-scoped queries, safe error shape; applied to every protected route | BR-20, BR-21, NFR-01, NFR-06 | F-01 | 1 | Accepted v0.1.0; extended to Sprint 2 routes (TEST-92) |
| F-03 | Accounts and balances | List own accounts grouped by type with derived balances; balance engine | FR-04, FR-08, BR-07, BR-13, BR-14, NFR-04 | F-01, F-02 | 1 | Accepted v0.1.0; `inUse` added (F-09) |
| F-04 | Opening balance | Set opening balance and date on Cash / Loan accounts | FR-05, BR-06, BR-09 | F-03 | 1 | Accepted v0.1.0; archived → 422 (F-09) |
| F-05 | Record transaction | Payment/charge and Money-received forms with allocation lines, server validation, atomic save | FR-06, FR-07, FR-08, BR-01–BR-07, BR-10–BR-12, NFR-05 | F-03 | 1 | Accepted v0.1.0; archived → 422 (F-09) |
| F-06 | Transaction history and detail | Newest-first list and detail of own transactions | FR-09, BR-15 | F-05 | 1 | Accepted v0.1.0; extended by F-11 |
| F-07 | Financial summary | Cash total, bank/wallet balances, card and other debt, loans given, income, expenses, net, category spending, optional date range | FR-10, BR-08 | F-03, F-05 | 1 | Accepted v0.1.0 |
| F-08 | User administration (enable/disable) | Admin user list; enable/disable sign-in; self-disable refused | FR-11, FR-12, BR-20, BR-22, BR-23 | F-01, F-02 | 1 | Accepted v0.1.0 |
| F-09 | Account management | Create, rename, archive/restore and delete (unused) financial accounts | FR-13, FR-14, BR-16, BR-17 | F-03 | 2 | Implemented + tested (PR #46) |
| F-10 | Transaction correction | Edit or delete a saved transaction with full re-validation | FR-15 | F-05, F-06 | 2 | Implemented + tested (PR #47) |
| F-11 | History search and filter | Date range, account, kind, text and amount filters with pagination | FR-16 | F-06 | 2 | Implemented + tested (PR #48) |
| F-12 | Favourites and Duplicate | Favourite flag, favourites view, Duplicate into a new editable form | FR-17, FR-18, BR-18, BR-19 | F-05, F-06 | 2 | Implemented + tested (PR #47) |
| F-13 | Loan overview | Outstanding per Loan Given / Loan Taken account with repayment history | FR-19 | F-03, F-05 | 2 | Implemented + tested (PR #49) |
| F-14 | Delivery pipeline *(system responsibility, Lab 5)* | Docker image, CI on PRs, deploy from `main` to Cloud Run + Cloud SQL, persistence check | NFR-07, NFR-08, NFR-09 | F-01–F-08 | 2 | Implemented + verified in Lab 5 (C-01–C-06) |
| F-15 | Monthly reports | Income, expense and category spending per month for a year | FR-20 | F-07 | 3 | Contract written; planned D3 |
| F-16 | Account credentials administration | Admin creates users with temporary password; user changes own password | FR-21, FR-22 | F-01, F-08 | 3 | FR-22 implemented + tested (PR #50); FR-21 contract, planned D3 |
| F-17 | Product hardening | Sign-in rate limit, performance smoke, responsive/accessibility pass, regression suite | NFR-10, NFR-11, NFR-12 | all | 3 | Contract written; planned D3 |

## Approved changes

| Date | Change | Reason |
|---|---|---|
| 2026-11-14 | Baseline created. | — |
| 2026-11-25 | F-09 also covers restore and deleting unused accounts (BR-17 already allowed delete-if-unused). | Wording only; scope unchanged. |
| 2026-11-26 | Status column added for Deliverable 2. | Checkpoint reporting. |
