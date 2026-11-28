import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { PASSWORD, makeUser, signIn } from "../support/fixtures.js";

// F-16 FR-22 Change own password - AC-76..AC-79.
const NEW = "Brand-New-Pass-2026";
const hashOf = async (id: number) => (await getPrisma().user.findUniqueOrThrow({ where: { id } })).passwordHash;
const login = (email: string, password: string) => request(app).post("/api/auth/login").send({ email, password });

describe("PUT /api/auth/password", () => {
  it("TEST-95 changes the password, keeps this session and ends the others (AC-76)", async () => {
    const { user, email } = await makeUser();
    const here = await signIn(email);
    const other = await signIn(email);
    const res = await here.put("/api/auth/password").send({ currentPassword: PASSWORD, newPassword: NEW });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect((await login(email, NEW)).status).toBe(200);
    expect((await login(email, PASSWORD)).status).toBe(401);
    expect((await here.get("/api/auth/me")).status).toBe(200);
    expect((await other.get("/api/auth/me")).status).toBe(401);
    expect(await hashOf(user.id)).toMatch(/^scrypt\$/);
  });

  it("TEST-96 a wrong current password or a bad new password changes nothing (AC-77, AC-78)", async () => {
    const { user, email } = await makeUser();
    const here = await signIn(email);
    const other = await signIn(email);
    const before = await hashOf(user.id);
    const cases: [object, string][] = [
      [{ currentPassword: "Wrong-Pass-2026", newPassword: NEW }, "currentPassword"],
      [{ currentPassword: PASSWORD, newPassword: "x".repeat(11) }, "newPassword"],
      [{ currentPassword: PASSWORD, newPassword: PASSWORD }, "newPassword"],
      [{ newPassword: NEW }, "currentPassword"],
    ];
    for (const [body, field] of cases) {
      const res = await here.put("/api/auth/password").send(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_FAILED");
      expect(res.body.error.fields[field]).toBeDefined();
    }
    expect(await hashOf(user.id)).toBe(before);
    expect((await other.get("/api/auth/me")).status).toBe(200);
  });

  it("TEST-97 anonymous is refused; an administrator changes only their own password (AC-79)", async () => {
    expect((await request(app).put("/api/auth/password").send({ currentPassword: PASSWORD, newPassword: NEW })).status).toBe(401);
    const admin = await makeUser("ADMIN");
    const b = await makeUser();
    const bBefore = await hashOf(b.user.id);
    const adminAgent = await signIn(admin.email);
    const res = await adminAgent.put("/api/auth/password").send({ currentPassword: PASSWORD, newPassword: NEW });
    expect(res.status).toBe(200);
    expect((await login(admin.email, NEW)).status).toBe(200);
    expect(await hashOf(b.user.id)).toBe(bBefore);
  });
});
