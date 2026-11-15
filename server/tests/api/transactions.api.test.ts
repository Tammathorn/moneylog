import { beforeAll, describe, expect, it } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { insertTransaction } from "../../src/lib/transactions-repo.js";
import { counts, makeSignedInUser } from "../support/fixtures.js";

type U = Awaited<ReturnType<typeof makeSignedInUser>>;
let a: U;
let b: U;
const TODAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());

async function balances(u: U): Promise<Record<string, number>> {
  const res = await u.agent.get("/api/accounts");
  return Object.fromEntries(res.body.accounts.map((x: { name: string; balanceSatang: number }) => [x.name, x.balanceSatang]));
}
const line = (accountId: number, amountSatang: number) => ({ accountId, amountSatang });
const post = (u: U, body: object) => u.agent.post("/api/transactions").send({ date: "2026-11-10", ...body });

beforeAll(async () => {
  a = await makeSignedInUser();
  b = await makeSignedInUser();
});

describe("POST /api/transactions - normal journeys", () => {
  it("TEST-24 saves a payment with its line atomically and moves both balances (AC-21)", async () => {
    const before = await balances(a);
    const res = await post(a, { kind: "PAYMENT", accountId: a.acc["KBank Savings"], totalSatang: 120000, description: "PEA bill",
      lines: [line(a.acc.Electricity, 120000)] });
    expect(res.status).toBe(201);
    const tx = await getPrisma().moneyTransaction.findUniqueOrThrow({ where: { id: res.body.transaction.id }, include: { lines: true } });
    expect(tx).toMatchObject({ userId: a.user.id, kind: "PAYMENT", totalSatang: 120000, description: "PEA bill" });
    expect(tx.lines).toHaveLength(1);
    expect(res.body.transaction.lines[0].account).toEqual({ id: a.acc.Electricity, name: "Electricity", type: "EXPENSE" });
    const after = await balances(a);
    expect(after["KBank Savings"] - before["KBank Savings"]).toBe(-120000);
    expect(after.Electricity - before.Electricity).toBe(120000);
  });

  it("TEST-25 card purchase split across Dining and Groceries raises card debt (AC-22)", async () => {
    const before = await balances(a);
    const res = await post(a, { kind: "PAYMENT", accountId: a.acc["KTC Credit Card"], totalSatang: 185000,
      lines: [line(a.acc.Dining, 65000), line(a.acc.Groceries, 120000)] });
    expect(res.status).toBe(201);
    const after = await balances(a);
    expect(after["KTC Credit Card"] - before["KTC Credit Card"]).toBe(185000);
    expect(after.Dining - before.Dining).toBe(65000);
    expect(after.Groceries - before.Groceries).toBe(120000);
  });

  it("TEST-26 card repayment from the bank is not an expense (AC-23, BR-08)", async () => {
    const before = await balances(a);
    const summaryBefore = (await a.agent.get("/api/summary")).body;
    const res = await post(a, { kind: "PAYMENT", accountId: a.acc["KBank Savings"], totalSatang: 100000,
      lines: [line(a.acc["KTC Credit Card"], 100000)] });
    expect(res.status).toBe(201);
    const after = await balances(a);
    expect(after["KBank Savings"] - before["KBank Savings"]).toBe(-100000);
    expect(after["KTC Credit Card"] - before["KTC Credit Card"]).toBe(-100000);
    for (const name of ["Dining", "Groceries", "Electricity", "Telecom"]) expect(after[name]).toBe(before[name]);
    const summaryAfter = (await a.agent.get("/api/summary")).body;
    if (summaryBefore.expenseSatang !== undefined) expect(summaryAfter.expenseSatang).toBe(summaryBefore.expenseSatang);
  });

  it("TEST-27 salary received increases bank and Salary (AC-24)", async () => {
    const before = await balances(a);
    const res = await a.agent.post("/api/transactions").send({ kind: "RECEIPT", accountId: a.acc["KBank Savings"], date: TODAY,
      totalSatang: 2500000, lines: [line(a.acc.Salary, 2500000)] });
    expect(res.status).toBe(201);
    const after = await balances(a);
    expect(after["KBank Savings"] - before["KBank Savings"]).toBe(2500000);
    expect(after.Salary - before.Salary).toBe(2500000);
  });
});

describe("POST /api/transactions - rejections save nothing", () => {
  it("TEST-29 rejects an allocation mismatch with 422 and writes no rows (AC-25, BR-01, NFR-05)", async () => {
    const before = await counts();
    const res = await post(a, { kind: "PAYMENT", accountId: a.acc["KTC Credit Card"], totalSatang: 185000,
      lines: [line(a.acc.Dining, 65000), line(a.acc.Groceries, 119999)] });
    expect(res.status).toBe(422);
    expect(res.body.error).toEqual({ code: "ALLOCATION_MISMATCH", message: "Allocated ฿1,849.99 does not equal the total ฿1,850.00." });
    expect(await counts()).toEqual(before);
  });

  it("TEST-31 rejects a payment line to an income account (AC-26)", async () => {
    const before = await counts();
    const res = await post(a, { kind: "PAYMENT", accountId: a.acc["KBank Savings"], totalSatang: 100, lines: [line(a.acc.Salary, 100)] });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("ACCOUNT_TYPE_NOT_ALLOWED");
    expect(await counts()).toEqual(before);
  });

  it("TEST-34 rejects malformed input with 400 naming the field (AC-28)", async () => {
    const base = { kind: "PAYMENT", accountId: a.acc.Wallet, totalSatang: 100, lines: [line(a.acc.Dining, 100)] };
    const zero = await post(a, { ...base, totalSatang: 0 });
    expect(zero.status).toBe(400);
    expect(zero.body.error.fields).toHaveProperty("totalSatang");
    const many = await post(a, { ...base, lines: Array.from({ length: 21 }, () => line(a.acc.Dining, 1)) });
    expect(many.body.error.fields).toHaveProperty("lines");
    const future = await post(a, { ...base, date: "2999-01-01" });
    expect(future.status).toBe(400);
    expect(future.body.error.fields).toHaveProperty("date");
  });

  it("TEST-35 another user's account is indistinguishable from a missing one (AC-29, BR-06)", async () => {
    const before = await counts();
    const header = await post(a, { kind: "PAYMENT", accountId: b.acc["KBank Savings"], totalSatang: 100, lines: [line(a.acc.Dining, 100)] });
    const asLine = await post(a, { kind: "PAYMENT", accountId: a.acc.Wallet, totalSatang: 100, lines: [line(b.acc.Dining, 100)] });
    const missing = await post(a, { kind: "PAYMENT", accountId: 999999, totalSatang: 100, lines: [line(a.acc.Dining, 100)] });
    for (const r of [header, asLine, missing]) expect(r.status).toBe(422);
    expect(header.body).toEqual(missing.body);
    expect(asLine.body).toEqual(missing.body);
    expect(missing.body.error.code).toBe("ACCOUNT_NOT_FOUND");
    expect(await counts()).toEqual(before);
  });

  it("TEST-36 a failing line insert rolls back the header (AC-30, BR-12)", async () => {
    const before = await counts();
    await expect(insertTransaction(getPrisma(), a.user.id, {
      kind: "PAYMENT", accountId: a.acc.Wallet, date: "2026-11-10", totalSatang: 100, description: "rollback-probe",
      lines: [{ accountId: 2_000_000_000, amountSatang: 100, note: null }],
    })).rejects.toThrow();
    expect(await getPrisma().moneyTransaction.count({ where: { description: "rollback-probe" } })).toBe(0);
    expect(await counts()).toEqual(before);
  });
});

describe("GET /api/transactions", () => {
  it("TEST-38 lists only the caller's transactions, date desc then newest first (AC-32, BR-15)", async () => {
    const u = await makeSignedInUser();
    const other = await makeSignedInUser();
    const mk = (date: string, d: string) => u.agent.post("/api/transactions").send({ kind: "PAYMENT", accountId: u.acc.Wallet, date,
      totalSatang: 100, description: d, lines: [line(u.acc.Dining, 100)] });
    await mk("2026-11-01", "first");
    await mk("2026-11-05", "second");
    await mk("2026-11-01", "third");
    await other.agent.post("/api/transactions").send({ kind: "PAYMENT", accountId: other.acc.Wallet, date: "2026-11-09",
      totalSatang: 100, description: "other", lines: [line(other.acc.Dining, 100)] });
    const res = await u.agent.get("/api/transactions");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.items.map((t: { description: string }) => t.description)).toEqual(["second", "third", "first"]);
  });

  it("TEST-39 returns the caller's detail and 404 for others, unknown and malformed ids (AC-33)", async () => {
    const mine = (await post(a, { kind: "PAYMENT", accountId: a.acc.Wallet, totalSatang: 250, lines: [line(a.acc.Telecom, 250)] })).body.transaction;
    const theirs = (await post(b, { kind: "PAYMENT", accountId: b.acc.Wallet, totalSatang: 250, lines: [line(b.acc.Telecom, 250)] })).body.transaction;
    const res = await a.agent.get(`/api/transactions/${mine.id}`);
    expect(res.status).toBe(200);
    expect(res.body.transaction).toMatchObject({ id: mine.id, account: { name: "Wallet" }, lines: [{ amountSatang: 250, account: { name: "Telecom" } }] });
    for (const id of [theirs.id, 999999, "abc"]) {
      const r = await a.agent.get(`/api/transactions/${id}`);
      expect(r.status).toBe(404);
      expect(r.body.error.code).toBe("NOT_FOUND");
    }
  });
});
