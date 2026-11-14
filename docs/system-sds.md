# MoneyLog — System-Level Software Design Specification (SDS)

Version 1.0 (2026-11-14). Requirements: `docs/srs.md`. Feature-level detail for Sprint 1:
`docs/sprints/sprint-1/`.

## 1. Architecture and stack

MoneyLog is a **modular monolith** with three logical layers. In development the UI and API run
as two processes; in production one Node process serves both (one Docker image, §7).

![Architecture](diagrams/architecture.svg)

| Layer | Technology | Responsibility |
|---|---|---|
| UI | React 18 + TypeScript, Vite 6, React Router 6, plain CSS tokens | Screens, form state, client-side hints (live remaining amount, required fields). **Never** the authority for any rule or permission. |
| API / application | Node 22, Express 4, TypeScript, Zod-free hand validation in `server/src/lib/validation.ts` | Authentication, authorisation, input validation, business rules (BR-01–BR-24), balance engine, error mapping. **All business rules and permissions are enforced here.** |
| Domain logic | Pure TypeScript modules `server/src/domain/*` (no Express, no Prisma) | Money parsing, transaction validation rules, balance effects and summary calculation — unit-testable in isolation. |
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
| `Account` | id, userId, name, type, subtype, openingBalanceSatang, openingDate, isActive, createdAt | FK → User (**owner**). unique(userId, name). CHECK openingBalanceSatang ≥ 0. type ∈ CASH, LOAN_GIVEN, LOAN_TAKEN, INCOME, EXPENSE; subtype ∈ WALLET, BANK, CREDIT_CARD, PERSONAL, OTHER or null. |
| `MoneyTransaction` | id, userId, kind, accountId, date, totalSatang, description, isFavourite, createdAt | FK → User (**owner**), FK → Account (paying/receiving). kind ∈ PAYMENT, RECEIPT. CHECK totalSatang > 0. index(userId, date desc). |
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
Groceries, Electricity and Telecom (Expense). The seed password comes from `SEED_DEMO_PASSWORD`
(never committed). The test suite migrates and seeds a separate `moneylog_test` database.

## 3. UI structure and conventions

| Screen | Path | Role | Purpose |
|---|---|---|---|
| Sign in | `/login` | anyone | E-mail + password form |
| Overview | `/` | USER | Summary cards: total cash, card/other debt, loans given, income, expenses, net; category spending |
| Accounts | `/accounts` | USER | Accounts by type with balance; set opening balance |
| New transaction | `/transactions/new` | USER | Toggle Payment / Money received; account, date, total, lines with live remaining |
| History | `/transactions` | USER | Newest-first list |
| Transaction detail | `/transactions/:id` | USER | Header and lines |
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
| 422 | `ALLOCATION_MISMATCH`, `ACCOUNT_NOT_FOUND`, `ACCOUNT_TYPE_NOT_ALLOWED`, `DUPLICATE_LINE_ACCOUNT`, `SELF_DISABLE_FORBIDDEN`, … | Well-formed request that breaks a business rule |
| 500 | `INTERNAL_ERROR` | Unexpected failure; generic message, details only in the server log (NFR-06) |

The detailed endpoint contracts are in each feature's specification.

## 5. Roles, permissions and ownership

| Operation | Endpoint | Anonymous | USER | ADMIN |
|---|---|---|---|---|
| Sign in | `POST /api/auth/login` | ✔ | ✔ | ✔ |
| Sign out / current user | `POST /api/auth/logout`, `GET /api/auth/me` | 401 | ✔ own | ✔ own |
| List accounts + balances | `GET /api/accounts` | 401 | ✔ **own only** | 403 |
| Set opening balance | `PUT /api/accounts/:id/opening-balance` | 401 | ✔ own (other's → 404) | 403 |
| Record transaction | `POST /api/transactions` | 401 | ✔ own accounts only (other's → 422) | 403 |
| History / detail | `GET /api/transactions[/:id]` | 401 | ✔ own (other's → 404) | 403 |
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
- **CSRF**: SameSite=Strict cookie plus an `Origin` check on POST/PUT/PATCH/DELETE.

## 7. Configuration and delivery design

| Variable | Used by | Example (`.env.example`) | Secret? |
|---|---|---|---|
| `DATABASE_URL` | server, Prisma | `postgresql://moneylog:moneylog@localhost:5432/moneylog` | Yes in cloud |
| `PORT` | server | `3000` | No |
| `NODE_ENV` | server | `development` / `production` | No |
| `CLIENT_ORIGIN` | server Origin check | `http://localhost:5173` | No |
| `COOKIE_SECURE` | server | `false` locally, `true` on Cloud Run | No |
| `SEED_DEMO_PASSWORD` | seed only | `change-me-locally` | Yes in cloud |
| `SERVE_CLIENT` | server | `true` in the image: Express serves `client/dist` | No |

Real values live in an untracked `server/.env` locally and in **Secret Manager** on GCP;
`.gitignore` excludes `.env`. The client contains no secrets (it only knows `/api`).

**Planned GCP deployment (Lab 5).** One multi-stage Dockerfile builds the client and server and
runs `node dist/index.js` (migrations run as a separate `prisma migrate deploy` job step).
Components: **Artifact Registry** (image), **Cloud Run** service `moneylog` in
`asia-southeast1` (stateless, scales to zero), **Cloud SQL for PostgreSQL 16** (durable data,
NFR-08) connected through the Cloud SQL connector, **Secret Manager** for `DATABASE_URL` and
`SEED_DEMO_PASSWORD`, and **GitHub Actions** with Workload Identity Federation: CI on PRs to
`staging`/`main`, deploy on merge to `main`. No local disk is used for data, so a container
restart or redeploy loses nothing.
