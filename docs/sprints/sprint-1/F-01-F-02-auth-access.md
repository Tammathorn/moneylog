# F-01 Sign-in, sign-out, current user · F-02 Access-control foundation

Contract version 1.0 (2026-11-14) · Issue #3 · Branch `feature/3-auth`

## 1. Purpose and linked requirements

F-01 gives every person a real identity: FR-01, FR-02, FR-03, BR-23, BR-24, NFR-02, NFR-03.
F-02 is the shared responsibility that every later route uses to refuse anonymous callers, wrong
roles and other users' data: BR-20, BR-21, NFR-01, NFR-06.

## 2. Behaviour and workflow

1. Visitor opens `/login`, enters e-mail and password, presses **Sign in**.
2. API lower-cases and trims the e-mail, loads the user, verifies the scrypt hash.
3. On success: create `Session` (SHA-256 of a 32-byte random token, `expiresAt = now + 8 h`),
   set cookie `ml_session`, return the user DTO. UI routes USER → `/`, ADMIN → `/admin/users`.
4. On every protected request `requireAuth` resolves the cookie to a user (§6 of the system SDS).
5. **Sign out** → API deletes the session row, clears the cookie, returns 204; UI goes to `/login`.

States: *Anonymous* → (valid sign-in) → *Signed in* → (sign-out | 8 h expiry | user disabled) →
*Anonymous*.

## 3. Business rules, validation and failure cases

- BR-24: unknown e-mail, wrong password and disabled user all return **401
  `INVALID_CREDENTIALS`** "E-mail or password is incorrect." and set no cookie.
- Missing/empty `email` or `password`, or not strings → **400 `VALIDATION_FAILED`** with `fields`.
- Expired session: refused with **401 `AUTH_REQUIRED`** and its row deleted.
- Disabled user with a live session: refused with 401 on the next request (BR-23).
- Any protected route without a valid session → 401 `AUTH_REQUIRED`, body has only `error`.
- Role check (F-02) runs before parameters or records are touched → 403 `FORBIDDEN_ROLE`.
- State-changing request with an `Origin` other than `CLIENT_ORIGIN` → 403 `ORIGIN_NOT_ALLOWED`.
- Unhandled exception → 500 `INTERNAL_ERROR` "Something went wrong. Please try again." — no stack.

## 4. Permissions

Sign-in: anyone. `me` and sign-out: any signed-in role, own session only. F-02 provides
`userOnly` (`USER`) and `adminOnly` (`ADMIN`) middleware chains; financial routes use `userOnly`.

## 5. API

| Method / path | Request | Success | Errors |
|---|---|---|---|
| `POST /api/auth/login` | `{ "email": string, "password": string }` | 200 `{ "user": { id, email, displayName, role } }` + `Set-Cookie: ml_session=…; HttpOnly; SameSite=Strict; Path=/` | 400 `VALIDATION_FAILED`, 401 `INVALID_CREDENTIALS` |
| `POST /api/auth/logout` | — (cookie) | 204, cookie cleared (`Max-Age=0`) | 401 `AUTH_REQUIRED` |
| `GET /api/auth/me` | — (cookie) | 200 `{ "user": { id, email, displayName, role } }` | 401 `AUTH_REQUIRED` |

## 6. UI

Sign-in page: e-mail and password fields (labels, `autocomplete`), **Sign in** button disabled
and labelled "Signing in…" while busy; error alert under the heading for 401; field messages for
400. App shell loads `GET /api/auth/me` on start (shows "Loading…"); 401 → sign-in page. Top bar
shows display name, role and **Sign out**. A USER visiting `/admin/users` or an ADMIN visiting a
financial page sees "This page is not available for your role."

## 7. Data

`User`, `Session` (system SDS §2). Migration `init` creates both. No change to other layers.

## 8. Acceptance criteria

| AC | Given / When / Then |
|---|---|
| AC-01 | Given seeded enabled user alice, when she signs in with the right password, then 200 with her `id, email, displayName, role` only (no hash), and an `ml_session` cookie that is HttpOnly and SameSite=Strict. |
| AC-02 | Given wrong password, unknown e-mail, or disabled user dave, when signing in, then 401 `INVALID_CREDENTIALS` with the identical message in all three cases and no cookie. |
| AC-03 | Given a body missing e-mail or password, when signing in, then 400 `VALIDATION_FAILED` with `fields` naming the missing field. |
| AC-04 | Given a valid session, `GET /api/auth/me` returns the caller's own identity; without a cookie it returns 401 `AUTH_REQUIRED`. |
| AC-05 | Given a signed-in user, when signing out, then 204, the cookie is cleared, the session row is gone, and the old token gets 401 on `me` and on `GET /api/accounts`. |
| AC-06 | Given a session whose `expiresAt` has passed, any protected request returns 401 and the row is deleted. |
| AC-07 | Passwords are stored as `scrypt$…` hashes that differ from the password and from each other for equal passwords; verification accepts only the right password. |
| AC-08 | In the browser, a USER who signs in lands on Overview with their name in the top bar; an ADMIN lands on Users; a wrong password shows "E-mail or password is incorrect." |
| AC-09 | Every protected route (`/api/auth/me`, `/api/auth/logout`, `/api/accounts`, `/api/accounts/:id/opening-balance`, `/api/transactions`, `/api/transactions/:id`, `/api/summary`, `/api/admin/users`, `/api/admin/users/:id`) returns 401 `AUTH_REQUIRED` without a session, and the body has no other key than `error`. |
| AC-10 | An ADMIN calling any financial route gets 403 `FORBIDDEN_ROLE` and no financial data (BR-20). |
| AC-11 | A USER calling `/api/admin/users` (GET) or `/api/admin/users/:id` (PATCH) gets 403 `FORBIDDEN_ROLE`. |
| AC-12 | A POST with `Origin: https://evil.example` is refused 403 `ORIGIN_NOT_ALLOWED` and writes nothing. |
| AC-13 | An unexpected server error returns 500 `INTERNAL_ERROR` with the generic message and no stack, SQL or path. |

## 9. Test considerations

API tests use real PostgreSQL (`moneylog_test`) and Supertest agents that keep cookies. Test users
are created per test file with unique e-mails. See `sts.md` TEST-01 – TEST-15.

## Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-14 | First contract, before implementation. |
