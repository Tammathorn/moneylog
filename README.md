# MoneyLog

Personal Money and Expense Logging System, the CPE 334 group project (theme 7), Semester 1/2026.
Team: Tammathorn Kananurak (67070503489, @Tammathorn) and Chakriwat Srivilai (67070503407, @GusGusxz).

Users log payments and money received across cash, bank, credit-card, loan, income and expense
accounts. MoneyLog keeps balances, debt, income/expense and history correct. An administrator
controls who can sign in but cannot see anyone's money.

| Document | Path |
|---|---|
| SRS | `docs/srs.md` |
| Feature inventory / traceability | `docs/features.md`, `docs/traceability.md` |
| System-level SDS | `docs/system-sds.md` |
| Three-sprint plan | `docs/sprints/plan.md` |
| Sprint 1 contracts, STS, DoD, results | `docs/sprints/sprint-1/` |

## Stack

Node 22, Express 4, TypeScript, Prisma 5 and PostgreSQL 16 for the API. React 18 with Vite 6 for the UI.
Vitest, Supertest, Testing Library and Playwright 1.63 for the tests.

## Local setup

Prerequisites: Node 22+, PostgreSQL 16, for example in Docker:

```bash
docker run --name moneylog-db -e POSTGRES_USER=moneylog -e POSTGRES_PASSWORD=moneylog \
  -e POSTGRES_DB=moneylog -p 5432:5432 -d postgres:16
```

```bash
cp server/.env.example server/.env        # then replace every CHANGE_ME with your own local value
npm install --prefix server
npm install --prefix client
npm install                               # Playwright (root)
cd server && npx prisma migrate deploy && npm run db:seed && cd ..
npm run dev --prefix server               # API on http://localhost:3000
npm run dev --prefix client               # UI on http://localhost:5173
```

### Environment variables (`server/.env`, never committed)

| Variable | Example | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://moneylog:moneylog@localhost:5432/moneylog?schema=public` | PostgreSQL connection |
| `PORT` | `3000` | API port |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed `Origin` for writes (CSRF check) |
| `COOKIE_SECURE` | `false` | `true` behind HTTPS (Cloud Run) |
| `SERVE_CLIENT` | `false` | `true` in the Docker image: Express serves `client/dist` |
| `APP_COMMIT_SHA` | `local` | Commit shown by `/api/version` (set by the image build) |
| `ADMIN_PASSWORD` | *(your choice, 12+ chars)* | Seed only: password of `admin@moneylog.test` |
| `SEED_DEMO_DATA` | `true` | Seed only: also create the demo users |
| `DEMO_USER_PASSWORD` | *(your choice, 12+ chars)* | Seed only: password of the demo users |

### Demo accounts (created by the seed, synthetic data)

| E-mail | Role | Notes |
|---|---|---|
| `admin@moneylog.test` | ADMIN | Users page only |
| `alice@moneylog.test` | USER | 10 seeded accounts, no transactions |
| `bob@moneylog.test` | USER | 10 seeded accounts, no transactions |
| `dave@moneylog.test` | USER | Disabled: cannot sign in |

The admin uses `ADMIN_PASSWORD`, and the demo users use `DEMO_USER_PASSWORD`. No real password is stored in Git. Deployment to GCP: `docs/labs/lab-05/deployment.md`.

## Tests

```bash
npm test --prefix server     # unit + API/DB tests; creates and seeds moneylog_test automatically
npm test --prefix client     # UI component tests
npx playwright test          # E2E: resets moneylog_e2e, starts API + UI itself
bash scripts/verify-release.sh   # builds + all suites, saves output with the commit id
```

If Playwright's browser is missing, run `npx playwright install chromium`.
E2E needs a `moneylog_e2e` database that the `moneylog` role can reset
(`CREATE DATABASE moneylog_e2e OWNER moneylog;`). Override it with `E2E_DATABASE_URL`.

## Workflow

Each Issue gets a branch `feature/<n>-<slug>` from `sprint-1-staging`. Its PR goes into
`sprint-1-staging` and the teammate reviews it. Then a release PR merges `sprint-1-staging` into
`main`, and the release is tagged `v0.1.0`. Docker, CI/CD and GCP come in Lab 5 (system SDS §7).
