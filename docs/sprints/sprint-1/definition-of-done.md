# Product Definition of Done (applies to every feature and release)

A feature or release is **Done** only when every item has evidence a reviewer can check. An AI
agent's statement that something works is not evidence.

| # | Criterion | Evidence |
|---|---|---|
| 1 | The contract (feature SDS, API/UI/data spec, AC) was committed **before** the implementation. | Commit order in `git log` |
| 2 | Required behaviour is implemented through UI, API and DB as the contract states; any deviation is recorded in the contract's version history. | Code diff, contract history |
| 3 | Every AC maps to at least one planned test in the STS, and those tests were run. | `sts.md`, `test-results.md` |
| 4 | Rule work followed TDD: the rule test failed first, then passed after implementation. | Red/green commits + saved output |
| 5 | All server, client and E2E tests pass on the release commit; any failed/skipped test is reported, never deleted or weakened. | Command, commit, counts in `test-results.md` |
| 6 | Authorisation is enforced in the API and covered by negative tests (401, 403, other user's data). | access/ownership tests |
| 7 | A teammate (not the author) reviewed the PR with a specific check, question or finding, and it was merged into `sprint-1-staging`. | PR page |
| 8 | After integration, the full suites ran on `sprint-1-staging`, then a reviewed release PR merged it into `main` and the release was tagged. | Release PR, tag |
| 9 | README (setup, env vars, migrate, seed, run, test) and docs are current; no secrets committed. | README, `.env.example`, `git grep` |
| 10 | Incomplete work and known limitations are disclosed. | `test-results.md` §Known limitations |
