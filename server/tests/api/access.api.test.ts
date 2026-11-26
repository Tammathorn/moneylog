import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { counts, makeSignedInUser } from "../support/fixtures.js";

// F-02 access-control foundation, run against every protected route.
let user: Awaited<ReturnType<typeof makeSignedInUser>>;
let admin: Awaited<ReturnType<typeof makeSignedInUser>>;
beforeAll(async () => {
  user = await makeSignedInUser("USER");
  admin = await makeSignedInUser("ADMIN");
});

type Method = "get" | "post" | "put" | "patch" | "delete";
const FINANCIAL: [Method, string][] = [
  ["get", "/api/accounts"], ["put", "/api/accounts/1/opening-balance"], ["post", "/api/transactions"],
  ["get", "/api/transactions"], ["get", "/api/transactions/1"], ["get", "/api/summary"],
];
// Sprint 2 routes (TEST-92): each feature PR adds its new protected routes here.
const SPRINT2: [Method, string][] = [
  ["post", "/api/accounts"], ["patch", "/api/accounts/1"], ["delete", "/api/accounts/1"],
  ["put", "/api/transactions/1"], ["delete", "/api/transactions/1"], ["put", "/api/transactions/1/favourite"],
];
const ADMIN: [Method, string][] = [["get", "/api/admin/users"], ["patch", "/api/admin/users/1"]];
const SESSION: [Method, string][] = [["get", "/api/auth/me"], ["post", "/api/auth/logout"]];

describe("TEST-11 every protected route refuses anonymous callers (AC-09, NFR-01)", () => {
  for (const [method, path] of [...SESSION, ...FINANCIAL, ...ADMIN]) {
    it(`${method.toUpperCase()} ${path} -> 401 with no data`, async () => {
      const res = await request(app)[method](path).send({});
      expect(res.status).toBe(401);
      expect(Object.keys(res.body)).toEqual(["error"]);
      expect(res.body.error.code).toBe("AUTH_REQUIRED");
    });
  }
});

describe("TEST-12 an administrator gets no financial data (AC-10, BR-20)", () => {
  for (const [method, path] of FINANCIAL) {
    it(`${method.toUpperCase()} ${path} -> 403`, async () => {
      const res = await admin.agent[method](path).send({});
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: { code: "FORBIDDEN_ROLE", message: "You do not have access to this." } });
    });
  }
});

describe("TEST-13 a user cannot call admin operations (AC-11)", () => {
  for (const [method, path] of ADMIN) {
    it(`${method.toUpperCase()} ${path} -> 403`, async () => {
      const res = await user.agent[method](path).send({ isActive: false });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    });
  }
});

describe("TEST-14 cross-site writes are refused (AC-12)", () => {
  it("POST with a foreign Origin -> 403 and nothing saved", async () => {
    const before = await counts();
    const res = await user.agent.post("/api/transactions").set("Origin", "https://evil.example").send({
      kind: "PAYMENT", accountId: user.acc.Wallet, date: "2026-11-10", totalSatang: 100, lines: [{ accountId: user.acc.Dining, amountSatang: 100 }],
    });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ORIGIN_NOT_ALLOWED");
    expect(await counts()).toEqual(before);
  });
});

describe("TEST-92 Sprint 2 routes refuse anonymous callers and administrators (AC-09, AC-10 extended)", () => {
  for (const [method, path] of SPRINT2) {
    it(`${method.toUpperCase()} ${path} -> 401 anonymous, 403 admin`, async () => {
      const anon = await request(app)[method](path).send({});
      expect(anon.status).toBe(401);
      expect(Object.keys(anon.body)).toEqual(["error"]);
      const res = await admin.agent[method](path).send({});
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: { code: "FORBIDDEN_ROLE", message: "You do not have access to this." } });
    });
  }
});
