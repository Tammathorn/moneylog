import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { makeSignedInUser } from "../support/fixtures.js";

// F-13 Loan overview - AC-68..AC-71.
type U = Awaited<ReturnType<typeof makeSignedInUser>>;
let a: U;
let b: U;
const ids: Record<string, number> = {};

beforeAll(async () => {
  a = await makeSignedInUser();
  b = await makeSignedInUser();
  const post = async (u: U, body: object) => (await u.agent.post("/api/transactions").send(body)).body.transaction.id as number;
  const k = a.acc["KBank Savings"];
  ids.lend = await post(a, { kind: "PAYMENT", accountId: k, date: "2026-11-05", totalSatang: 500_000, description: "Lent to Beam", lines: [{ accountId: a.acc["Loan to Beam"], amountSatang: 500_000 }] });
  ids.back = await post(a, { kind: "RECEIPT", accountId: k, date: "2026-11-20", totalSatang: 200_000, description: "Beam paid back", lines: [{ accountId: a.acc["Loan to Beam"], amountSatang: 200_000 }] });
  ids.card = await post(a, { kind: "PAYMENT", accountId: a.acc["KTC Credit Card"], date: "2026-11-10", totalSatang: 185_000, lines: [{ accountId: a.acc.Dining, amountSatang: 65_000 }, { accountId: a.acc.Groceries, amountSatang: 120_000 }] });
  ids.repay = await post(a, { kind: "PAYMENT", accountId: k, date: "2026-11-15", totalSatang: 100_000, lines: [{ accountId: a.acc["KTC Credit Card"], amountSatang: 100_000 }] });
  await post(b, { kind: "PAYMENT", accountId: b.acc.Wallet, date: "2026-11-05", totalSatang: 70_000, description: "B lends", lines: [{ accountId: b.acc["Loan to Beam"], amountSatang: 70_000 }] });
});

const balanceOf = async (u: U, name: string) => (await u.agent.get("/api/accounts")).body.accounts.find((x: { name: string }) => x.name === name).balanceSatang;

describe("GET /api/loans", () => {
  it("TEST-88 outstanding equals the account balance; history and totals (AC-68, AC-69)", async () => {
    const res = await a.agent.get("/api/loans");
    expect(res.status).toBe(200);
    const beam = res.body.given.find((l: { account: { name: string } }) => l.account.name === "Loan to Beam");
    const card = res.body.taken.find((l: { account: { name: string } }) => l.account.name === "KTC Credit Card");
    expect(beam.outstandingSatang).toBe(300_000);
    expect(card.outstandingSatang).toBe(85_000);
    expect(beam.outstandingSatang).toBe(await balanceOf(a, "Loan to Beam"));
    expect(card.outstandingSatang).toBe(await balanceOf(a, "KTC Credit Card"));
    expect(beam.history).toEqual([
      { transactionId: ids.lend, date: "2026-11-05", kind: "PAYMENT", description: "Lent to Beam", changeSatang: 500_000, runningSatang: 500_000 },
      { transactionId: ids.back, date: "2026-11-20", kind: "RECEIPT", description: "Beam paid back", changeSatang: -200_000, runningSatang: 300_000 },
    ]);
    expect(card.history.map((r: { transactionId: number }) => r.transactionId)).toEqual([ids.card, ids.repay]);
    expect(res.body.totalGivenSatang).toBe(300_000);
    expect(res.body.totalTakenSatang).toBe(85_000);
  });

  it("TEST-89 only the caller's loans; admin 403; anonymous 401 (AC-70)", async () => {
    const res = await a.agent.get("/api/loans");
    const allTx = [...res.body.given, ...res.body.taken].flatMap((l: { history: { description: string | null }[] }) => l.history.map((h) => h.description));
    expect(allTx).not.toContain("B lends");
    const bIds = new Set(Object.values(b.acc));
    for (const l of [...res.body.given, ...res.body.taken]) expect(bIds.has(l.account.id)).toBe(false);
    const admin = await makeSignedInUser("ADMIN");
    const adm = await admin.agent.get("/api/loans");
    expect(adm.status).toBe(403);
    expect(adm.body.error.code).toBe("FORBIDDEN_ROLE");
    const anon = await request(app).get("/api/loans");
    expect(anon.status).toBe(401);
    expect(anon.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("TEST-90 archived loans are listed only while something is outstanding (AC-71)", async () => {
    const settled = (await a.agent.post("/api/accounts").send({ name: "Loan to Nok", type: "LOAN_GIVEN" })).body.account.id;
    await a.agent.patch(`/api/accounts/${settled}`).send({ isActive: false });
    await a.agent.patch(`/api/accounts/${a.acc["Loan to Beam"]}`).send({ isActive: false });
    const res = await a.agent.get("/api/loans");
    const names = res.body.given.map((l: { account: { name: string; isActive: boolean } }) => [l.account.name, l.account.isActive]);
    expect(names).toContainEqual(["Loan to Beam", false]);
    expect(names.map((n: [string, boolean]) => n[0])).not.toContain("Loan to Nok");
    await a.agent.patch(`/api/accounts/${a.acc["Loan to Beam"]}`).send({ isActive: true });
  });
});
