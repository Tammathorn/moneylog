import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { PASSWORD, makeSignedInUser, makeUser, signIn } from "../support/fixtures.js";

let admin: Awaited<ReturnType<typeof makeSignedInUser>>;
beforeAll(async () => {
  admin = await makeSignedInUser("ADMIN");
});

describe("admin user management", () => {
  it("TEST-45 lists users with identity fields only - no hash, no financial data (AC-38, BR-20)", async () => {
    const res = await admin.agent.get("/api/admin/users");
    expect(res.status).toBe(200);
    expect(res.body.users.length).toBeGreaterThanOrEqual(4);
    for (const u of res.body.users) expect(Object.keys(u).sort()).toEqual(["createdAt", "displayName", "email", "id", "isActive", "role"]);
    expect(JSON.stringify(res.body)).not.toMatch(/scrypt|Satang|balance/i);
  });

  it("TEST-46 disabling ends the user's sessions and sign-in; enabling restores sign-in (AC-39, BR-23)", async () => {
    const bob = await makeUser("USER");
    const bobAgent = await signIn(bob.email);
    expect((await bobAgent.get("/api/auth/me")).status).toBe(200);

    const off = await admin.agent.patch(`/api/admin/users/${bob.user.id}`).send({ isActive: false });
    expect(off.status).toBe(200);
    expect(off.body.user).toMatchObject({ id: bob.user.id, isActive: false });
    expect((await bobAgent.get("/api/auth/me")).status).toBe(401);
    expect(await getPrisma().session.count({ where: { userId: bob.user.id } })).toBe(0);
    const login = await request(app).post("/api/auth/login").send({ email: bob.email, password: PASSWORD });
    expect(login.status).toBe(401);
    expect(login.body.error.code).toBe("INVALID_CREDENTIALS");

    expect((await admin.agent.patch(`/api/admin/users/${bob.user.id}`).send({ isActive: true })).status).toBe(200);
    expect((await request(app).post("/api/auth/login").send({ email: bob.email, password: PASSWORD })).status).toBe(200);
  });

  it("TEST-47 an admin cannot disable their own account (AC-40, BR-22)", async () => {
    const res = await admin.agent.patch(`/api/admin/users/${admin.user.id}`).send({ isActive: false });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("SELF_DISABLE_FORBIDDEN");
    expect((await getPrisma().user.findUniqueOrThrow({ where: { id: admin.user.id } })).isActive).toBe(true);
    expect((await admin.agent.get("/api/auth/me")).status).toBe(200);
  });

  it("TEST-48 unknown ids are 404 and bad bodies are 400 (AC-41)", async () => {
    expect((await admin.agent.patch("/api/admin/users/999999").send({ isActive: false })).status).toBe(404);
    const someone = await makeUser("USER");
    for (const body of [{}, { isActive: "no" }]) {
      const r = await admin.agent.patch(`/api/admin/users/${someone.user.id}`).send(body);
      expect(r.status).toBe(400);
      expect(r.body.error.fields).toHaveProperty("isActive");
    }
  });
});
