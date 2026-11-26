import { beforeAll, describe, expect, it } from "vitest";
import { makeSignedInUser } from "../support/fixtures.js";

// F-11 History search, filter and pagination - AC-58..AC-61 against real PostgreSQL.
type U = Awaited<ReturnType<typeof makeSignedInUser>>;
let a: U;
let b: U;
const ids: Record<string, number> = {};

// A's five known transactions (newest first by date): t5, t4, t3, t2, t1.
beforeAll(async () => {
  a = await makeSignedInUser();
  b = await makeSignedInUser();
  const post = async (u: U, body: object) => (await u.agent.post("/api/transactions").send(body)).body.transaction.id as number;
  ids.t1 = await post(a, { kind: "RECEIPT", accountId: a.acc["KBank Savings"], date: "2026-10-25", totalSatang: 2_500_000, description: "October salary", lines: [{ accountId: a.acc.Salary, amountSatang: 2_500_000 }] });
  ids.t2 = await post(a, { kind: "PAYMENT", accountId: a.acc["KTC Credit Card"], date: "2026-11-03", totalSatang: 185_000, description: "Central World", lines: [{ accountId: a.acc.Dining, amountSatang: 65_000 }, { accountId: a.acc.Groceries, amountSatang: 120_000, note: "Weekly TOPS" }] });
  ids.t3 = await post(a, { kind: "PAYMENT", accountId: a.acc.Wallet, date: "2026-11-05", totalSatang: 12_000, description: "Coffee", lines: [{ accountId: a.acc.Dining, amountSatang: 12_000 }] });
  ids.t4 = await post(a, { kind: "PAYMENT", accountId: a.acc["KBank Savings"], date: "2026-11-15", totalSatang: 100_000, description: "Card repayment", lines: [{ accountId: a.acc["KTC Credit Card"], amountSatang: 100_000 }] });
  ids.t5 = await post(a, { kind: "PAYMENT", accountId: a.acc["KBank Savings"], date: "2026-11-20", totalSatang: 230_000, description: "Electric bill", lines: [{ accountId: a.acc.Electricity, amountSatang: 230_000 }] });
  await a.agent.put(`/api/transactions/${ids.t3}/favourite`).send({ isFavourite: true });
  await a.agent.put(`/api/transactions/${ids.t5}/favourite`).send({ isFavourite: true });
  ids.bCentral = await post(b, { kind: "PAYMENT", accountId: b.acc.Wallet, date: "2026-11-03", totalSatang: 185_000, description: "Central World", lines: [{ accountId: b.acc.Dining, amountSatang: 185_000 }] });
});

const list = async (u: U, query: string) => {
  const res = await u.agent.get(`/api/transactions?${query}`);
  return { status: res.status, ids: (res.body.items ?? []).map((t: { id: number }) => t.id), total: res.body.total, body: res.body };
};

describe("TEST-82 each filter returns exactly the expected transactions (AC-58)", () => {
  it.each([
    ["date range", () => "from=2026-11-01&to=2026-11-15", ["t4", "t3", "t2"]],
    ["account as header", () => `accountId=${a.acc["KBank Savings"]}`, ["t5", "t4", "t1"]],
    ["account as line", () => `accountId=${a.acc.Dining}`, ["t3", "t2"]],
    ["account as header or line", () => `accountId=${a.acc["KTC Credit Card"]}`, ["t4", "t2"]],
    ["kind", () => "kind=RECEIPT", ["t1"]],
    ["text in description, any case", () => "q=CENTRAL", ["t2"]],
    ["text in a line note", () => "q=tops", ["t2"]],
    ["amount range inclusive", () => "minSatang=100000&maxSatang=230000", ["t5", "t4", "t2"]],
    ["favourites", () => "favourite=true", ["t5", "t3"]],
    ["two filters with AND", () => `kind=PAYMENT&accountId=${a.acc.Dining}&minSatang=50000`, ["t2"]],
  ])("%s", async (_name, query, expected) => {
    const r = await list(a, query());
    expect(r.status).toBe(200);
    expect(r.ids).toEqual(expected.map((k) => ids[k]));
    expect(r.total).toBe(expected.length);
  });
});

describe("TEST-83 invalid queries are refused with the field named (AC-59)", () => {
  it.each([
    ["from=2026-02-30", "from"], ["from=2026-11-30&to=2026-11-01", "from"], ["minSatang=-1", "minSatang"], ["minSatang=1.5", "minSatang"],
    ["minSatang=500&maxSatang=100", "minSatang"], ["kind=OTHER", "kind"], ["accountId=abc", "accountId"], ["favourite=yes", "favourite"],
    [`q=${"x".repeat(101)}`, "q"],
  ])("%s", async (query, field) => {
    const r = await list(a, query);
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("VALIDATION_FAILED");
    expect(r.body.error.fields[field]).toBeDefined();
  });
});

describe("TEST-84 filters never reach another user's data (AC-60, BR-21)", () => {
  it("a query matching B's data returns only A's", async () => {
    const r = await list(a, "q=central&from=2026-11-03&to=2026-11-03");
    expect(r.ids).toEqual([ids.t2]);
    expect(r.ids).not.toContain(ids.bCentral);
  });
  it("B's account id matches nothing for A", async () => {
    const r = await list(a, `accountId=${b.acc.Wallet}`);
    expect(r.ids).toEqual([]);
    expect(r.total).toBe(0);
  });
});

describe("TEST-85 pagination (AC-61)", () => {
  it("limit=2&offset=2 returns the 3rd and 4th items and the full total", async () => {
    const r = await list(a, "limit=2&offset=2");
    expect(r.ids).toEqual([ids.t3, ids.t2]);
    expect(r.total).toBe(5);
  });
});
