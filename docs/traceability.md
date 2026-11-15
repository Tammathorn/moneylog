# MoneyLog — Requirements Traceability

Version 1.0 (2026-11-14). Requirement → feature/responsibility → sprint → verification. Sprint 1
rows name AC and tests (`docs/sprints/sprint-1/`). Later-sprint rows are allocated now and get AC
and tests when their contract is written.

| Requirement | Feature / responsibility | Sprint | Verification |
|---|---|---|---|
| FR-01 | F-01 Sign-in | 1 | AC-01, AC-08 / TEST-01, TEST-09, TEST-10 |
| FR-02 | F-01 Sign-out | 1 | AC-05 / TEST-05, TEST-50 |
| FR-03 | F-01 Current user | 1 | AC-04 / TEST-04 |
| FR-04 | F-03 Accounts and balances | 1 | AC-14, AC-17 / TEST-16, TEST-20 |
| FR-05 | F-04 Opening balance | 1 | AC-18 / TEST-21 |
| FR-06 | F-05 Record transaction (payment) | 1 | AC-21, AC-22, AC-23 / TEST-24 – TEST-26 |
| FR-07 | F-05 Record transaction (receipt) | 1 | AC-24 / TEST-27 |
| FR-08 | F-03 balance engine + F-05 | 1 | AC-15, AC-21 – AC-24 / TEST-17, TEST-24 – TEST-27, TEST-50 |
| FR-09 | F-06 History and detail | 1 | AC-32 – AC-34 / TEST-38 – TEST-40 |
| FR-10 | F-07 Financial summary | 1 | AC-35, AC-36 / TEST-41 – TEST-43, TEST-50 |
| FR-11 | F-08 User list | 1 | AC-38 / TEST-45 |
| FR-12 | F-08 Enable/disable | 1 | AC-39, AC-42 / TEST-46, TEST-49 |
| FR-13 | F-09 Account management | 2 | Contract in Sprint 2 |
| FR-14 | F-09 Account management | 2 | Contract in Sprint 2 |
| FR-15 | F-10 Transaction correction | 2 | Contract in Sprint 2 |
| FR-16 | F-11 Search and filter | 2 | Contract in Sprint 2 |
| FR-17 | F-12 Favourites | 2 | Contract in Sprint 2 |
| FR-18 | F-12 Duplicate | 2 | Contract in Sprint 2 |
| FR-19 | F-13 Loan overview | 2 | Contract in Sprint 2 |
| FR-20 | F-15 Monthly reports | 3 | Contract in Sprint 3 |
| FR-21 | F-16 Credentials administration | 3 | Contract in Sprint 3 |
| FR-22 | F-16 Credentials administration | 3 | Contract in Sprint 3 |
| BR-01 | F-05 Allocation must equal total | 1 | AC-25 / TEST-28, TEST-29, TEST-51 |
| BR-02 | F-05 Amount limits | 1 | AC-28 / TEST-33, TEST-34 |
| BR-03 | F-05 Header account type | 1 | AC-26 / TEST-30, TEST-31 |
| BR-04 | F-05 Line account types | 1 | AC-26 / TEST-30, TEST-31 |
| BR-05 | F-05 No self/duplicate line accounts | 1 | AC-27 / TEST-32 |
| BR-06 | F-04, F-05 Own active accounts only | 1 | AC-20, AC-29 / TEST-23, TEST-35 |
| BR-07 | F-03 Balance engine | 1 | AC-15 / TEST-17, TEST-24 – TEST-27 |
| BR-08 | F-07 Only income/expense lines counted | 1 | AC-23, AC-35 / TEST-26, TEST-41, TEST-42 |
| BR-09 | F-04 Opening-balance rules | 1 | AC-19 / TEST-22 |
| BR-10 | F-05 Date range | 1 | AC-28 / TEST-33, TEST-34 |
| BR-11 | F-05 Text limits | 1 | AC-28 / TEST-33 |
| BR-12 | F-05 Atomic save | 1 | AC-25, AC-30 / TEST-29, TEST-36 |
| BR-13 | F-03 Derived balances | 1 | AC-16 / TEST-19 (design: no balance column, SDS §2) |
| BR-14 | F-03 Negative cash allowed and flagged | 1 | AC-17 / TEST-20 |
| BR-15 | F-06 History order | 1 | AC-32 / TEST-38 |
| BR-16 | F-09 Archived accounts | 2 | Contract in Sprint 2 |
| BR-17 | F-09 Delete/type-change limits | 2 | Contract in Sprint 2 |
| BR-18 | F-12 Duplicate not auto-saved | 2 | Contract in Sprint 2 |
| BR-19 | F-12 Favourite privacy | 2 | Contract in Sprint 2 |
| BR-20 | F-02 + F-08 Admin has no financial access | 1 | AC-10, AC-38 / TEST-12, TEST-45, TEST-52 |
| BR-21 | F-02 Owner-only records | 1 | AC-14, AC-29, AC-33, AC-37 / TEST-16, TEST-35, TEST-39, TEST-44 |
| BR-22 | F-08 No self-disable | 1 | AC-40 / TEST-47 |
| BR-23 | F-01 + F-08 Disabled user loses access | 1 | AC-02, AC-39 / TEST-02, TEST-46 |
| BR-24 | F-01 Uniform sign-in failure | 1 | AC-02 / TEST-02 |
| NFR-01 | F-02 Unauthenticated rejection | 1 | AC-09 / TEST-11 |
| NFR-02 | F-01 Password hashing | 1 | AC-01, AC-07 / TEST-01, TEST-07, TEST-08, TEST-45 |
| NFR-03 | F-01 Session design | 1 | AC-01, AC-05, AC-06 / TEST-01, TEST-05, TEST-06 |
| NFR-04 | F-03 Exact money | 1 | AC-16 / TEST-18, TEST-19 |
| NFR-05 | F-05 Atomicity | 1 | AC-25, AC-30 / TEST-29, TEST-36 |
| NFR-06 | F-02 Safe errors | 1 | AC-13 / TEST-15 |
| NFR-07 | F-14 Secrets/config (established S1) | 1 / 2 | S1: `.env.example`, review checklist; S2: secret scanning in Lab 5 |
| NFR-08 | F-14 Durable storage (established S1) | 1 / 2 | S1: PostgreSQL, manual restart check; S2: GCP restart/redeploy (Lab 5) |
| NFR-09 | F-14 Docker + GCP pipeline | 2 | Lab 5 pipeline evidence |
| NFR-10 | F-17 Performance | 3 | Perf smoke (S3); S1 design: index (userId, date) |
| NFR-11 | F-17 Responsive / accessible | 3 | Playwright widths + checklist (S3); S1 design tokens and labels |
| NFR-12 | F-17 Sign-in rate limit | 3 | API test (S3) |

**Coverage gaps.** None: every FR, BR and NFR has a feature/responsibility and sprint. Gaps for
later sprints are intentional (no AC yet) and listed above as "Contract in Sprint N".

**Approved changes.** None since the baseline (2026-11-14).
