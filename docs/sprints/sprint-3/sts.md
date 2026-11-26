# Sprint 3 — Software Test Specification (progress)

Version 1.0 (2026-11-26). Levels as in Sprint 2. Implemented in D2: F-16 FR-22.

| Test | AC | Lvl | Precondition / input | Action | Expected result | File |
|---|---|---|---|---|---|---|
| TEST-94 | AC-78 | U | current "Old-Pass-2026!", new of 11/12/128/129 chars, new = current | `checkNewPassword()` | 11, 129, same → field error; 12, 128 ok | server/tests/unit/password-policy.test.ts |
| TEST-95 | AC-76 | A | A signed in with agents 1 and 2 | PUT /api/auth/password from agent 1 | 200; login with new ok, old 401; agent 1 /me 200; agent 2 /me 401 | server/tests/api/password.api.test.ts |
| TEST-96 | AC-77, AC-78 | A | A signed in | wrong current; 11-char new; new = current | 400 with the field; hash unchanged; agent 2 still signed in | password.api.test.ts |
| TEST-97 | AC-79 | A | anonymous; ADMIN signed in, user B | anonymous PUT; ADMIN changes own password | 401; ADMIN's hash changes, B's hash unchanged | password.api.test.ts |
| TEST-98 | AC-80 | C | fetch mocked | type mismatching confirm; submit; server 400 field; success | "Passwords do not match." and button disabled; field error shown; success message | client/tests/ChangePassword.test.tsx |
| (planned) | AC-81–AC-89 | U/A/C/E | see F-15, F-16 FR-21, F-17 contracts | — | — | D3 |
