# F-17 Product hardening

Contract version 1.0 (2026-11-26) · Planned for Deliverable 3 · NFR-10, NFR-11, NFR-12

| Requirement | Design | Acceptance criterion (planned) | Verification |
|---|---|---|---|
| NFR-12 sign-in rate limit | In-memory sliding window keyed by lower-cased e-mail in `POST /api/auth/login`: 10 attempts per 15 minutes, then 429 `TOO_MANY_ATTEMPTS` with `Retry-After`; a successful sign-in does not reset the window (so it cannot be used to probe). Cloud Run max instances 2 → documented limit per instance. | AC-86: the 11th attempt within 15 min → 429 even with the right password; after the window, sign-in works; another e-mail is unaffected. | API test with a fake clock |
| NFR-10 performance | Seed script with 2,000 transactions for one user; `deploy/perf_smoke.py` sends 50 requests each to `/api/summary` and `/api/transactions` and reports p95. Index (userId, date) exists. | AC-87: p95 < 500 ms on the reference laptop and recorded for Cloud Run. | Script output in test results |
| NFR-11 responsive and accessible | Playwright screenshots of every page at 390, 834 and 1280 px; axe-core check for contrast and labels; keyboard-only run of the journey. | AC-88: no horizontal scroll at 390 px, no axe "serious" violations, journey completes by keyboard. | E2E + checklist |
| Regression | All Sprint 1–3 tests in CI on every PR and release. | AC-89: release commit green. | CI |
