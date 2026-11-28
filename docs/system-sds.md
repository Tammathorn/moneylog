# MoneyLog — System-Level Software Design Specification (SDS)

Version 2.0 (2026-11-26). Requirements: `docs/srs.md` (v2.0). Feature-level detail:
`docs/sprints/sprint-1/`, `docs/sprints/sprint-2/`, `docs/sprints/sprint-3/`. Deployment:
`docs/labs/lab-05/deployment.md`. Changes since 1.0 are listed in §8.

## 1. Architecture and stack

MoneyLog is a **modular monolith** with three logical layers. In development the UI and API run
as two processes; in production one Node process serves both (one Docker image, §7).

![Architecture](diagrams/architecture.svg)

| Layer | Technology | Responsibility |
|---|---|---|
| UI | React 18 + TypeScript, Vite 6, React Router 6, plain CSS tokens | Screens, form state, client-side hints (live remaining amount, required fields). **Never** the authority for any rule or permission. |
| API / application | Node 24 (Docker) / 22 (dev), Express 4, TypeScript, hand-written validation in `server/src/domain/*-input.ts`, `account-rules.ts`, `history-filter.ts`, `password-policy.ts` | Authentication, authorisation, input validation, business rules (BR-01–BR-24), balance engine, error mapping. **All business rules and permissions are enforced here.** |
| Domain logic | Pure TypeScript modules `server/src/domain/*` (no Express, no Prisma) | Money parsing, transaction and account rules, balance effects, summary, history-filter parsing, loan history, password policy — unit-testable in isolation. |
| Persistence | PostgreSQL 16, Prisma 5 ORM + migrations | Durable storage, foreign keys, unique and CHECK constraints as a second line of defence. |
| Tests | Vitest + Supertest (server), Vitest + Testing Library (client), Playwright (E2E) | See each sprint's STS. |

**Why this stack.** Both students used exactly this stack in Labs 1–4 (TokTickIT), so Sprint 1
effort goes into the domain instead of tooling. Express + Prisma fits one container; PostgreSQL
maps directly to Cloud SQL in Lab 5.

**Communication.** The browser calls the API over HTTP/JSON at `/api/*` with the session cookie.
In development Vite proxies `/api` to `localhost:3000`, so the browser always sees one origin.
The API talks to PostgreSQL through Prisma's connection pool. Request flow for a protected call:

1. `originCheck` (state-changing methods only) → 2. `requireAuth` (session cookie → user) →
3. `requireRole(...)` → 4. parse/validate params and body → 5. load records **scoped by
`userId = caller.id`** → 6. domain rule checks → 7. Prisma write in one DB transaction →
8. DTO mapping (no internal fields).

## 2. Data model

![Entity relationship diagram](diagrams/erd.svg)

| Entity | Key fields | Constraints and ownership |
|---|---|---|
| `User` | id, email, displayName, role (`USER`/`ADMIN`), passwordHash, isActive, createdAt | email unique (lower-cased). passwordHash never leaves the server. |
| `Session` | id, tokenHash, userId, createdAt, expiresAt | tokenHash unique (SHA-256 of cookie token). FK → User, cascade delete. |
| `Account` | id, userId, name, type, subtype, openingBalanceSatang, openingDate, isActive, createdAt | FK → User (**owner**). unique(userId, name). CHECK openingBalanceSatang between −1,000,000,000 and 1,000,000,000, and ≥ 0 unless type = CASH (v2.1, BR-09 rev. 3.0; v2.0: ≥ 0). type ∈ CASH, LOAN_GIVEN, LOAN_TAKEN, INCOME, EXPENSE; subtype ∈ WALLET, BANK, CREDIT_CARD, PERSONAL, OTHER or null. |
| `MoneyTransaction` | id, userId, kind, accountId, date, totalSatang, description, isFavourite, createdAt, updatedAt (2.0) | FK → User (**owner**), FK → Account (paying/receiving). kind ∈ PAYMENT, RECEIPT. CHECK totalSatang > 0. index(userId, date desc). |
| `TransactionLine` | id, transactionId, accountId, amountSatang, note | FK → MoneyTransaction (cascade), FK → Account. CHECK amountSatang > 0. unique(transactionId, accountId) (BR-05). |

Ownership rule: a transaction's paying account and every line account belong to the
transaction's user. The DB cannot express this cross-row rule, so the API enforces it (BR-06)
and tests prove it. Balances are **not** stored (D-02, BR-13): `balance = opening + Σ effects`
computed by `server/src/domain/balances.ts` from BR-07.

**Setup.** `npx prisma migrate deploy` applies migrations in `server/prisma/migrations/`;
`npm run db:seed` runs an **idempotent** seed (upsert by e-mail and by (userId, name)): admin
`admin@moneylog.test`, users `alice@moneylog.test`, `bob@moneylog.test`, and a disabled user
`dave@moneylog.test`. Each User gets: KBank Savings (Cash/Bank), Wallet (Cash/Wallet), KTC Credit
Card (Loan Taken/Credit card), Loan to Beam (Loan Given), Salary and Interest (Income), Dining,
Groceries, Electricity and Telecom (Expense). Seed passwords come from `ADMIN_PASSWORD` and, only
when `SEED_DEMO_DATA=true`, `DEMO_USER_PASSWORD` (≥ 12 characters, never committed; 2.0, Lab 5).
Migrations: `20261114093304_init`, `…_sprint2_transaction_updated_at` (nullable column, safe on
existing data). Archive uses the existing `Account.isActive`; favourites the existing `isFavourite`. The test suite migrates and seeds a separate `moneylog_test` database.

## 3. UI structure and conventions

| Screen | Path | Role | Purpose |
|---|---|---|---|
| Sign in | `/login` | anyone | E-mail + password form |
| Overview | `/` | USER | Summary cards: total cash, card/other debt, loans given, income, expenses, net; category spending |
| Accounts | `/accounts` | USER | Accounts by type with balance; set opening balance; New account, Rename, Archive, Delete (unused); Archived section with Restore (2.0) |
| New transaction | `/transactions/new` | USER | Toggle Payment / Money received; account, date, total, lines with live remaining |
| History | `/transactions` | USER | Newest-first list; filter bar (date, account, kind, text, amount, favourites) kept in the URL; pager; star (2.0) |
| Transaction detail | `/transactions/:id` | USER | Header and lines; Edit, Duplicate, Delete with confirmation, favourite star (2.0) |
| Edit transaction | `/transactions/:id/edit` | USER | The transaction form pre-filled; Save changes (2.0) |
| Duplicate | `/transactions/new?from=:id` | USER | The form pre-filled with today's date; not saved until submit (2.0) |
| Loans | `/loans` | USER | Money others owe me / Money I owe, outstanding and history with running balance (2.0) |
| Change password | `/account/password` | USER, ADMIN | Current + new password (2.0, Sprint 3) |
| Users | `/admin/users` | ADMIN | User list with enable/disable |

**Navigation.** A top bar shows the product name, links for the caller's role, the display name
and role, and **Sign out**. Visiting a route for the other role shows a "not available for your
role" page; the API refuses the data regardless (§5).

**Shared behaviour.**
- *Loading*: a "Loading…" status line (`role="status"`) replaces content; buttons that submit
  show "Saving…" and are disabled to prevent double submission.
- *Empty*: a sentence explaining what will appear and the next action (e.g. "No transactions yet
  — record your first one").
- *Validation*: required fields marked; the server's `fields` map is shown under each field; a
  summary alert at the top lists rule errors (e.g. allocation mismatch). Entered values are kept.
- *Errors*: 401 → return to sign-in with "Your session has ended"; 403 → "You do not have access";
  network/500 → "Something went wrong. Please try again." — never raw server text.
- *Money*: shown as `฿1,234.50`; negative balances in red with a "negative" label (BR-14).
- *Design tokens*: primary `#1F5F8B`, success `#1E7B4A`, danger `#B42318`, surface `#FFFFFF`,
  page `#F4F6F8`, text `#1D2733`; system font stack; 8 px spacing grid; breakpoints 576/768/992 px.

## 4. API conventions

- Base path `/api`, JSON in and out, nouns in plural (`/accounts`, `/transactions`).
- Money fields end in `Satang` and are integers; dates are `YYYY-MM-DD` strings.
- Success: `200` read/update, `201` create (body = created resource), `204` sign-out.
- Errors always have one shape:
  `{ "error": { "code": "ALLOCATION_MISMATCH", "message": "…", "fields": { "lines": "…" } } }`
  (`fields` only for validation).

| Status | Code(s) | When |
|---|---|---|
| 400 | `VALIDATION_FAILED` | Missing/malformed field, wrong type, bad date format |
| 401 | `AUTH_REQUIRED`, `INVALID_CREDENTIALS` | No/expired/ended session; failed sign-in (BR-24) |
| 403 | `FORBIDDEN_ROLE`, `ORIGIN_NOT_ALLOWED` | Role may not call the route; cross-site write |
| 404 | `NOT_FOUND` | Path id does not exist **or belongs to another user** (BR-06, D-11) |
| 409 | `ACCOUNT_NAME_TAKEN` (2.0) | Unique name per user (D-13) |
| 422 | `ALLOCATION_MISMATCH`, `ACCOUNT_NOT_FOUND`, `ACCOUNT_TYPE_NOT_ALLOWED`, `DUPLICATE_LINE_ACCOUNT`, `SELF_DISABLE_FORBIDDEN`, `OPENING_NOT_ALLOWED`; 2.0: `ACCOUNT_ARCHIVED`, `ACCOUNT_IN_USE`, `ACCOUNT_TYPE_LOCKED` | Well-formed request that breaks a business rule |
| 500 | `INTERNAL_ERROR` | Unexpected failure; generic message, details only in the server log (NFR-06) |

The detailed endpoint contracts are in each feature's specification.

## 5. Roles, permissions and ownership

| Operation | Endpoint | Anonymous | USER | ADMIN |
|---|---|---|---|---|
| Sign in | `POST /api/auth/login` | ✔ | ✔ | ✔ |
| Sign out / current user | `POST /api/auth/logout`, `GET /api/auth/me` | 401 | ✔ own | ✔ own |
| List accounts + balances | `GET /api/accounts` | 401 | ✔ **own only** | 403 |
| Create / update / delete account (2.0) | `POST /api/accounts`, `PATCH`/`DELETE /api/accounts/:id` | 401 | ✔ own (other's → 404) | 403 |
| Set opening balance | `PUT /api/accounts/:id/opening-balance` | 401 | ✔ own (other's → 404) | 403 |
| Record transaction | `POST /api/transactions` | 401 | ✔ own accounts only (other's → 422) | 403 |
| History (with F-11 filters) / detail | `GET /api/transactions[/:id]` | 401 | ✔ own (other's → 404) | 403 |
| Edit / delete / favourite (2.0) | `PUT`/`DELETE /api/transactions/:id`, `PUT /api/transactions/:id/favourite` | 401 | ✔ own (other's → 404) | 403 |
| Loans (2.0) | `GET /api/loans` | 401 | ✔ own | 403 |
| Change own password (2.0) | `PUT /api/auth/password` | 401 | ✔ own only | ✔ own only |
| Summary | `GET /api/summary` | 401 | ✔ own | 403 |
| List users | `GET /api/admin/users` | 401 | 403 | ✔ (no financial data) |
| Enable/disable user | `PATCH /api/admin/users/:id` | 401 | 403 | ✔ except self (422) |

Role checks run **before** any resource is loaded, so a 403 does not reveal whether a record
exists. Ownership is enforced by putting `userId: caller.id` in every financial query — the
client never sends a user id, and any `userId` field in a body is ignored. A hidden menu item is
only convenience; the API is the control.

## 6. Authentication and sessions

- **Passwords**: scrypt (N=16384, r=8, p=1, 16-byte salt, 64-byte key) via `node:crypto`;
  stored as `scrypt$N$r$p$salt$hash`; compared with `timingSafeEqual`. Unknown e-mails still
  run one scrypt so timing does not reveal which e-mails exist (BR-24).
- **Session creation**: on sign-in, 32 random bytes → hex token in cookie `ml_session`
  (`HttpOnly; SameSite=Strict; Path=/`, plus `Secure` when `COOKIE_SECURE=true` in production).
  The `Session` row stores only SHA-256(token) and `expiresAt = createdAt + 8 h` (absolute, no
  sliding renewal).
- **Current user**: `requireAuth` hashes the cookie token, loads the session with its user,
  refuses if missing, expired (row deleted) or the user is disabled (BR-23). `GET /api/auth/me`
  returns `{ id, email, displayName, role }`.
- **Sign-out**: deletes the session row and clears the cookie; the old token then gets 401.
- **Disable**: the admin's PATCH sets `isActive=false` and deletes that user's sessions.
- **CSRF**: SameSite=Strict cookie plus an `Origin` check on POST/PUT/PATCH/DELETE. Behind the
  Cloud Run proxy the server's own origin (from `X-Forwarded-Host/Proto`) is also accepted (Lab 5).
- **Change password (2.0, FR-22)**: verifies the current password with scrypt, stores the new hash
  and deletes the user's other sessions in one DB transaction; the current session stays (D-17).

## 7. Configuration and delivery design

| Variable | Used by | Example (`.env.example`) | Secret? |
|---|---|---|---|
| `DATABASE_URL` | server, Prisma | `postgresql://moneylog:moneylog@localhost:5432/moneylog` | Yes in cloud |
| `PORT` | server | `3000` | No |
| `NODE_ENV` | server | `development` / `production` | No |
| `CLIENT_ORIGIN` | server Origin check | `http://localhost:5173` | No |
| `COOKIE_SECURE` | server | `false` locally, `true` on Cloud Run | No |
| `SERVE_CLIENT` | server | `true` in the image: Express serves `client/dist` | No |
| `APP_COMMIT_SHA` | `/api/version`, footer | set from the Docker build arg `GIT_SHA` | No |
| `ADMIN_PASSWORD` | seed only | `change-me-admin-2026` (≥ 12) | Yes |
| `SEED_DEMO_DATA` | seed only | `true` to create demo users | No |
| `DEMO_USER_PASSWORD` | seed only | `change-me-demo-2026` (≥ 12) | Yes |

*2.0: `SEED_DEMO_PASSWORD` was replaced by the three seed variables in Lab 5 (CR-03).*

Real values live in an untracked `server/.env` locally and in **Secret Manager** on GCP;
`.gitignore` excludes `.env`. The client contains no secrets (it only knows `/api`).

**GCP deployment (implemented in Lab 5, see `docs/labs/lab-05/deployment.md`).** One multi-stage Dockerfile builds the client and server and
runs `node dist/index.js` (migrations run as a separate `prisma migrate deploy` job step).
Components: **Artifact Registry** (image), **Cloud Run** service `moneylog` in
`asia-southeast1` (stateless, scales to zero), **Cloud SQL for PostgreSQL 16** (durable data,
NFR-08) connected through the Cloud SQL connector, **Secret Manager** for `DATABASE_URL` and
`SEED_DEMO_PASSWORD`, and **GitHub Actions** with Workload Identity Federation: CI on PRs to
`staging`/`main`, deploy on merge to `main`. No local disk is used for data, so a container
restart or redeploy loses nothing.


## 8. Changes since version 1.0

| Section | Change | Why |
|---|---|---|
| §1 | Node 24 in the image; validation modules renamed to the real files | Lab 5 image; documentation matched to code |
| §2 | `MoneyTransaction.updatedAt`; seed variables | F-10; Lab 5 production seed (CR-03) |
| §3 | Accounts management, History filters, detail actions, Edit, Duplicate, Loans, Change password screens | F-09 – F-13, F-16 |
| §4 | 409 `ACCOUNT_NAME_TAKEN`; 422 `ACCOUNT_ARCHIVED`, `ACCOUNT_IN_USE`, `ACCOUNT_TYPE_LOCKED` | F-09 (D-13, D-14) |
| §5 | Permissions for the new endpoints; all USER-only except change password | F-09 – F-13, F-16; TEST-92 |
| §6 | Proxy-aware Origin check; change password | Lab 5 finding CR-02; FR-22 |
| §7 | Delivery implemented; new variables | Lab 5 (F-14) |
| §2 (v2.1) | Account opening-balance CHECK becomes type-aware (Cash may be negative) via a new migration | Lab 7 CR-L7-01 (#64), BR-09 rev. 3.0 |
