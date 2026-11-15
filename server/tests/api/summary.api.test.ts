import { beforeAll, describe, expect, it } from "vitest";
import { makeSignedInUser } from "../support/fixtures.js";

type U = Awaited<ReturnType<typeof makeSignedInUser>>;
let a: U;
let b: U;
const line = (accountId: number, amountSatang: number) => ({ accountId, amountSatang });

beforeAll(async () => {
  a = await makeSignedInUser();
  b = await makeSignedInUser();
  // The Sprint 1 journey through the API.
  await a.agent.put(`/api/accounts/${a.acc["KBank Savings"]}/opening-balance`).send({ openingBalanceSatang: 1_000_000, openingDate: "2026-10-01" });
  const post = (body: object) => a.agent.post("/api/transactions").send(body).expect(201);
  await post({ kind: "RECEIPT", accountId: a.acc["KBank Savings"], date: "2026-10-15", totalSatang: 2_500_000, lines: [line(a.acc.Salary, 2_500_000)] });
  await post({ kind: "PAYMENT", accountId: a.acc["KTC Credit Card"], date: "2026-11-05", totalSatang: 185_000, lines: [line(a.acc.Dining, 65_000), line(a.acc.Groceries, 120_000)] });
  await post({ kind: "PAYMENT", accountId: a.acc["KBank Savings"], date: "2026-11-10", totalSatang: 100_000, lines: [line(a.acc["KTC Credit Card"], 100_000)] });
});

describe("GET /api/summary", () => {
  it("TEST-42 shows the journey figures exactly (AC-35)", async () => {
    const res = await a.agent.get("/api/summary");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      cash: { totalSatang: 3_400_000 }, debt: { totalSatang: 85_000 }, loansGiven: { totalSatang: 0 },
      incomeSatang: 2_500_000, expenseSatang: 185_000, netSatang: 2_315_000,
      categorySpending: [{ name: "Groceries", amountSatang: 120_000 }, { name: "Dining", amountSatang: 65_000 }],
      range: { from: null, to: null },
    });
  });

  it("TEST-43 limits flows to the range and validates it (AC-36)", async () => {
    const nov = await a.agent.get("/api/summary?from=2026-11-01&to=2026-11-30");
    expect(nov.status).toBe(200);
    expect(nov.body).toMatchObject({ incomeSatang: 0, expenseSatang: 185_000, cash: { totalSatang: 3_400_000 } });
    for (const q of ["from=2026-11-30&to=2026-11-01", "from=2026-1-1", "to=yesterday"]) {
      const r = await a.agent.get(`/api/summary?${q}`);
      expect(r.status, q).toBe(400);
      expect(r.body.error.code).toBe("VALIDATION_FAILED");
    }
  });

  it("TEST-44 another user's activity never changes this summary (AC-37, BR-21)", async () => {
    const before = (await a.agent.get("/api/summary")).body;
    await b.agent.post("/api/transactions").send({ kind: "PAYMENT", accountId: b.acc["KBank Savings"], date: "2026-11-10",
      totalSatang: 999_999, lines: [line(b.acc.Dining, 999_999)] }).expect(201);
    expect((await a.agent.get("/api/summary")).body).toEqual(before);
  });
});
