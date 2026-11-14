import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashSessionToken } from "../../src/lib/session.js";
import { PASSWORD, makeUser } from "../support/fixtures.js";

let alice: Awaited<ReturnType<typeof makeUser>>;
let disabled: Awaited<ReturnType<typeof makeUser>>;

function tokenFrom(res: request.Response): string {
  const cookie = ([] as string[]).concat(res.headers["set-cookie"] ?? [])[0] ?? "";
  return cookie.match(/ml_session=([0-9a-f]{64})/)?.[1] ?? "";
}

beforeAll(async () => {
  alice = await makeUser("USER");
  disabled = await makeUser("USER", false);
});

describe("POST /api/auth/login", () => {
  it("TEST-01 signs in with valid credentials and sets a protected cookie (AC-01)", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: alice.email.toUpperCase(), password: PASSWORD });
    expect(res.status).toBe(200);
    expect(Object.keys(res.body.user).sort()).toEqual(["displayName", "email", "id", "role"]);
    expect(res.body.user).toMatchObject({ id: alice.user.id, email: alice.email, role: "USER" });
    const cookie = ([] as string[]).concat(res.headers["set-cookie"])[0];
    expect(cookie).toMatch(/^ml_session=[0-9a-f]{64};/);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    expect(JSON.stringify(res.body)).not.toContain("scrypt");
  });

  it("TEST-02 gives one identical 401 for wrong password, unknown e-mail and disabled user (AC-02, BR-24)", async () => {
    const attempts = [
      { email: alice.email, password: "wrong-password" },
      { email: "nobody@moneylog.test", password: PASSWORD },
      { email: disabled.email, password: PASSWORD },
    ];
    const bodies = [];
    for (const body of attempts) {
      const res = await request(app).post("/api/auth/login").send(body);
      expect(res.status).toBe(401);
      expect(res.headers["set-cookie"]).toBeUndefined();
      bodies.push(res.body);
    }
    expect(bodies[0]).toEqual({ error: { code: "INVALID_CREDENTIALS", message: "E-mail or password is incorrect." } });
    expect(bodies[1]).toEqual(bodies[0]);
    expect(bodies[2]).toEqual(bodies[0]);
  });

  it("TEST-03 rejects a missing e-mail or password with 400 (AC-03)", async () => {
    const none = await request(app).post("/api/auth/login").send({});
    expect(none.status).toBe(400);
    expect(none.body.error.code).toBe("VALIDATION_FAILED");
    expect(Object.keys(none.body.error.fields).sort()).toEqual(["email", "password"]);
    const noPassword = await request(app).post("/api/auth/login").send({ email: alice.email });
    expect(noPassword.status).toBe(400);
    expect(Object.keys(noPassword.body.error.fields)).toEqual(["password"]);
  });
});

describe("current user, sign-out and expiry", () => {
  it("TEST-04 returns the caller's own identity, 401 when anonymous (AC-04)", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: alice.email, password: PASSWORD });
    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user).toEqual({ id: alice.user.id, email: alice.email, displayName: alice.user.displayName, role: "USER" });
    const anon = await request(app).get("/api/auth/me");
    expect(anon.status).toBe(401);
    expect(anon.body).toEqual({ error: { code: "AUTH_REQUIRED", message: "Your session has ended. Please sign in again." } });
  });

  it("TEST-05 sign-out deletes the session; the old token is refused (AC-05)", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: alice.email, password: PASSWORD });
    const token = tokenFrom(login);
    const cookie = `ml_session=${token}`;
    const out = await request(app).post("/api/auth/logout").set("Cookie", cookie);
    expect(out.status).toBe(204);
    expect(([] as string[]).concat(out.headers["set-cookie"])[0]).toMatch(/ml_session=;.*Max-Age=0/);
    expect(await getPrisma().session.count({ where: { tokenHash: hashSessionToken(token) } })).toBe(0);
    expect((await request(app).get("/api/auth/me").set("Cookie", cookie)).status).toBe(401);
    expect((await request(app).get("/api/accounts").set("Cookie", cookie)).status).toBe(401);
  });

  it("TEST-06 refuses an expired session and deletes its row (AC-06)", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: alice.email, password: PASSWORD });
    const token = tokenFrom(login);
    await getPrisma().session.update({ where: { tokenHash: hashSessionToken(token) }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const res = await request(app).get("/api/auth/me").set("Cookie", `ml_session=${token}`);
    expect(res.status).toBe(401);
    expect(await getPrisma().session.count({ where: { tokenHash: hashSessionToken(token) } })).toBe(0);
  });

  it("TEST-08 stores only a scrypt hash of the password (AC-07, NFR-02)", async () => {
    const row = await getPrisma().user.findUniqueOrThrow({ where: { email: "alice@moneylog.test" } });
    expect(row.passwordHash.startsWith("scrypt$")).toBe(true);
    expect(row.passwordHash).not.toContain(PASSWORD);
  });
});
