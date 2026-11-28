# Sprint 2 — Definition of Done

Version 1.0 (2026-11-25). The product Definition of Done (`docs/sprints/sprint-1/definition-of-done.md`,
criteria 1–10) applies unchanged to every Sprint 2 feature. Sprint 2 adds or adapts these points:

| # | Criterion | Evidence |
|---|---|---|
| 1 | The feature contract and its STS rows were merged **before** the feature's code (Issue #39 / its PR merged first). | Commit order in `git log`, PR dates |
| 2 | Rule work is test-first: the new rule test was committed and run red, then the implementation made it green. | Red and green commits; saved output in `docs/sprints/sprint-2/evidence/` |
| 3 | Every Sprint 1 test still passes (regression), and new protected routes are added to the 401/403 access tests. | CI `test-and-docker` on each PR; TEST-92 |
| 4 | Branch flow: feature branch from `staging` → PR into `staging` reviewed and approved by the teammate → release PR `staging` → `main` (ruleset: 1 approval + `test-and-docker`) → automatic deploy. | PR pages, Actions runs |
| 5 | The release is tagged `v0.2.0`; the deployed `/api/version` equals the tagged commit and the smoke test passed. | Tag, Deploy demo run |
| 6 | Schema changes are Prisma migrations committed with the code; they run in CI and in the Cloud Run migrate job. | `server/prisma/migrations/` |
| 7 | The Lab 6 UAT window is respected: no deploy of Sprint 2 to the URL under test without telling the partner team. | Notice in the Lab 6 record |
| 8 | Failed, skipped or not-yet-run tests and known limitations are disclosed in `test-results.md`. | `test-results.md` |
