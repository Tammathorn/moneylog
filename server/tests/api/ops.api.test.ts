import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { counts, makeSignedInUser } from "../support/fixtures.js";

// Lab 5 #2 (R-03, R-08): readiness and running-commit endpoints, same-origin writes behind Cloud Run.
describe("TEST-53 readiness reports a working database", () => {
  it("GET /api/ready -> 200 with db connected", async () => {
    const res = await request(app).get("/api/ready");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", db: "connected" });
  });
});

describe("TEST-54 version shows the running commit", () => {
  const saved = process.env.APP_COMMIT_SHA;
  afterEach(() => { process.env.APP_COMMIT_SHA = saved; });
  it("returns APP_COMMIT_SHA, or 'unknown' when it is not set", async () => {
    process.env.APP_COMMIT_SHA = "0123456789abcdef0123456789abcdef01234567";
    expect((await request(app).get("/api/version")).body).toEqual({ service: "moneylog", commit: "0123456789abcdef0123456789abcdef01234567" });
    delete process.env.APP_COMMIT_SHA;
    expect((await request(app).get("/api/version")).body.commit).toBe("unknown");
  });
});

describe("TEST-55 writes from the app's own origin are allowed; foreign origins are not", () => {
  it("accepts Origin equal to the request host and still refuses another host", async () => {
    const u = await makeSignedInUser();
    const body = { kind: "PAYMENT", accountId: u.acc.Wallet, date: "2026-11-10", totalSatang: 100, lines: [{ accountId: u.acc.Dining, amountSatang: 100 }] };
    const same = await u.agent.post("/api/transactions").set("Host", "moneylog-abc-as.a.run.app")
      .set("X-Forwarded-Proto", "https").set("Origin", "https://moneylog-abc-as.a.run.app").send(body);
    expect(same.status).toBe(201);
    const before = await counts();
    const foreign = await u.agent.post("/api/transactions").set("Host", "moneylog-abc-as.a.run.app")
      .set("Origin", "https://moneylog-abc-as.a.run.app.evil.example").send(body);
    expect(foreign.status).toBe(403);
    expect(await counts()).toEqual(before);
  });
});
