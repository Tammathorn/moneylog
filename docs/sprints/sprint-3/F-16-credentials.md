# F-16 Account credentials administration

Contract version 1.0 (2026-11-26) · Issue #44 · Branch `feature/44-sprint-3`
Status: **FR-22 change own password implemented in Sprint 3 progress (D2)**; FR-21 contract ready, implementation planned for D3.

## 1. Purpose and linked requirements

Users must be able to change their own password, and an administrator must be able to add
a user with a temporary password that has to be changed at first sign-in.
FR-21, FR-22, NFR-02 (scrypt), BR-23 (disabled users), BR-24 (no account enumeration).

## 2. Behaviour and workflow

**FR-22 Change own password (implemented).** Any signed-in user (User or Administrator)
opens **Change password** from the top bar, enters the current password, a new password and
the new password again, and presses **Change password**. On success the page says "Your
password was changed. Other devices were signed out."; this session stays signed in, every
other session of the same user is ended.

**FR-21 Create user (planned, D3).** On **Users** the administrator presses **New user**,
enters e-mail, display name and role; the system generates a 16-character temporary password,
shows it **once**, and sets `mustChangePassword`. At the next sign-in that user can only open
Change password until the password is changed.

## 3. Rules (FR-22, order of checks)

| Step | Check | Failure |
|---|---|---|
| 1 | Signed in | 401 `AUTH_REQUIRED` |
| 2 | `currentPassword`, `newPassword` are strings; new password 12–128 characters | 400 `VALIDATION_FAILED`, `fields.newPassword` "Use 12 to 128 characters." |
| 3 | New password differs from the current one | 400, `fields.newPassword` "Choose a password different from the current one." |
| 4 | `currentPassword` matches the stored hash (verified with scrypt, constant work) | 400, `fields.currentPassword` "The current password is not correct." — nothing changes |
| 5 | Store `hashPassword(newPassword)`; delete all the user's **other** sessions | — |

The length/difference rule is the pure function `checkNewPassword()` in
`server/src/domain/password-policy.ts`.

## 4. Permissions

Only for the signed-in user's own account; there is no user id in the request, so nobody can
change another user's password through this route. Both roles may use it.

## 5. API

| Method and path | Body | Success | Errors |
|---|---|---|---|
| `PUT /api/auth/password` | `{ "currentPassword": "…", "newPassword": "…" }` | 200 `{ "ok": true }` | 400, 401 |
| `POST /api/admin/users` (planned) | `{ email, displayName, role }` | 201 `{ user, temporaryPassword }` | 400, 409 `EMAIL_TAKEN` |

## 6. UI

`/account/password` page with three password inputs (autocomplete `current-password` /
`new-password`), live "Passwords do not match." check, server field errors under each input,
success message. Link **Change password** in the top bar for both roles.

## 7. Data

FR-22: no migration (updates `User.passwordHash`, deletes `Session` rows).
FR-21 (planned): migration adds `User.mustChangePassword Boolean @default(false)`.

## 8. Acceptance criteria

| AC | Given / When / Then | Status |
|---|---|---|
| AC-76 | Given A is signed in on two browsers, when A changes the password with the right current password, then 200; A can sign in with the new password and not with the old one; the current session still works; the other browser's session gets 401. | Implemented |
| AC-77 | A wrong current password → 400 `fields.currentPassword`, the stored hash is unchanged and no session is ended. | Implemented |
| AC-78 | A new password of 11 or 129 characters, or equal to the current one → 400 `fields.newPassword`; 12 and 128 characters are accepted. | Implemented |
| AC-79 | Anonymous → 401; the route changes only the caller's own password (an Administrator changing their password does not affect any user). | Implemented |
| AC-80 | The page checks that both new-password fields match before sending, shows server field errors, and shows the success message. | Implemented |
| AC-81 | (FR-21) An administrator creates a user; the temporary password is shown once; the new user must change it before any other page works. | Planned (D3) |

## 9. Test considerations

TEST-94 (unit `password-policy.test.ts`), TEST-95 – TEST-97 (API `password.api.test.ts`),
TEST-98 (UI `ChangePassword.test.tsx`). See `docs/sprints/sprint-3/sts.md`.

## Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-26 | First contract; FR-22 implemented, FR-21 planned. |
