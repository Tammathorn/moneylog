# Sprint 1 — Contributions and AI use

## Contribution table

> Fill in truthfully before submitting. Both students must be able to explain a sampled
> requirement, test, design decision or release step.

| Area | Tammathorn (@Tammathorn) | Chakriwat (@GusGusxz) |
|---|---|---|
| Theme choice, SRS decisions D-01 – D-11 | Drove the theme decision and the decisions with the AI agent | _to fill: e.g. reviewed and challenged D-04 / D-05_ |
| Baseline docs and Sprint 1 contracts (#1) | Author (AI-assisted) | Reviewer of PR #1 |
| Data model, auth, accounts, transactions, summary/admin (#2 – #6) | Author (AI-assisted) | Reviewer of PRs #2 – #6 |
| UI and E2E (#7) | Author (AI-assisted) | Reviewer of PR #7 |
| Integration and release PR to `main` | Opened the release PR | _to fill: ran the suites on staging, approved the release_ |

## AI-use declaration

| Tool | Used for | How the output was checked |
|---|---|---|
| Claude (Anthropic) agent | Drafted the SRS, SDS, contracts and STS from the stakeholder brief. Generated the server, client and test code per Issue. Ran the test suites and captured the output. | Each test was run and its output saved under `evidence/`. TDD red/green outputs are tied to commits. The teammate reviews every PR before it merges. The team read the contracts and diffs. |

No real personal data, secrets or passwords were given to the AI tool. All data is synthetic.
