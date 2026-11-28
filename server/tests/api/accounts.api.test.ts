import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { todayInBangkok } from "../../src/domain/dates.js";
import { makeSignedInUser } from "../support/fixtures.js";

let a: Awaited<ReturnType<typeof makeSignedInUser>>;
let b: Awaited<ReturnType<typeof makeSignedInUser>>;
const balanceOf = async (agent: typeof a.agent, id: number) =>
  (await agent.get("/api/accounts")).body.accounts.find((x: { id: number }) => x.id === id).balanceSatang as number;

beforeAll(async () => {
  a = await makeSignedInUser();
  b = await makeSignedInUser();
});

describe("GET /api/accounts", () => {
  it("TEST-16 returns only the caller's accounts, ordered by type then name, with balances (AC-14, BR-21)", async () => {
    const res = await a.agent.get("/api/accounts");
    expect(res.status).toBe(200);
    const ids = res.body.accounts.map((x: { id: number }) => x.id);
    expect(ids.sort()).toEqual(Object.values(a.acc).sort());
    for (const id of Object.values(b.acc)) expect(ids).not.toContain(id);
    expect(res.body.accounts.map((x: { name: string }) => x.name)).toEqual([
      "KBank Savings", "Wallet", "KTC Credit Card", "Loan to Beam", "Interest", "Salary", "Dining", "Electricity", "Groceries", "Telecom",
    ]);
    expect(res.body.accounts[0]).toEqual({
      id: a.acc["KBank Savings"], name: "KBank Savings", type: "CASH", subtype: "BANK",
      openingBalanceSatang: 0, openingDate: null, balanceSatang: 0, isActive: true, inUse: false, // inUse added by F-09 (contract §5)
    });
  });
});

describe("PUT /api/accounts/:id/opening-balance", () => {
  it("TEST-21 sets the opening balance and the balance rises by it (AC-18)", async () => {
    const id = a.acc["KBank Savings"];
    const before = await balanceOf(a.agent, id);
    const res = await a.agent.put(`/api/accounts/${id}/opening-balance`).send({ openingBalanceSatang: 1_000_000, openingDate: "2026-11-01" });
    expect(res.status).toBe(200);
    expect(res.body.account).toMatchObject({ id, openingBalanceSatang: 1_000_000, openingDate: "2026-11-01", balanceSatang: before + 1_000_000 });
    expect(await balanceOf(a.agent, id)).toBe(before + 1_000_000);
  });

  it("TEST-22 refuses income/expense accounts and invalid values, leaving the value unchanged (AC-19, BR-09)", async () => {
    const dining = await a.agent.put(`/api/accounts/${a.acc.Dining}/opening-balance`).send({ openingBalanceSatang: 100, openingDate: "2026-11-01" });
    expect(dining.status).toBe(422);
    expect(dining.body.error.code).toBe("OPENING_NOT_ALLOWED");

    const wallet = a.acc.Wallet;
    const tomorrow = new Date(Date.now() + 36 * 3600 * 1000).toISOString().slice(0, 10);
    const bad = [
      // rev. 2 (Lab 7, #64): -1 is valid for Cash under BR-09 rev. 3.0
      { openingBalanceSatang: -1_000_000_001, openingDate: "2026-11-01" },
      { openingBalanceSatang: 1.5, openingDate: "2026-11-01" },
      { openingBalanceSatang: 1_000_000_001, openingDate: "2026-11-01" },
      { openingBalanceSatang: 100, openingDate: tomorrow > todayInBangkok() ? tomorrow : "2999-01-01" },
      { openingBalanceSatang: 100, openingDate: "2026-13-01" },
    ];
    for (const body of bad) {
      const res = await a.agent.put(`/api/accounts/${wallet}/opening-balance`).send(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_FAILED");
    }
    const row = await getPrisma().account.findUniqueOrThrow({ where: { id: wallet } });
    expect(row.openingBalanceSatang).toBe(0);
  });

  it("TEST-23 treats another user's account exactly like a missing one (AC-20, BR-06)", async () => {
    const other = await a.agent.put(`/api/accounts/${b.acc["KBank Savings"]}/opening-balance`).send({ openingBalanceSatang: 5, openingDate: "2026-11-01" });
    const missing = await a.agent.put(`/api/accounts/999999/opening-balance`).send({ openingBalanceSatang: 5, openingDate: "2026-11-01" });
    expect(other.status).toBe(404);
    expect(other.body).toEqual(missing.body);
    const row = await getPrisma().account.findUniqueOrThrow({ where: { id: b.acc["KBank Savings"] } });
    expect(row.openingBalanceSatang).toBe(0);
  });
});

// Lab 7 CR-L7-01 (#64), BR-09 rev. 3.0. Fresh users keep these independent of the tests above.
const stored = async (id: number) =>
  (await getPrisma().account.findUniqueOrThrow({ where: { id } })).openingBalanceSatang;

describe("opening balance range by account type (BR-09 rev. 3.0)", () => {
  it("TEST-103 accepts a negative Cash opening down to -10,000,000.00 and derives the balance (AC-90)", async () => {
    const u = await makeSignedInUser();
    const wallet = u.acc.Wallet;
    const payment = await u.agent.post("/api/transactions").send({ kind: "PAYMENT", accountId: wallet, date: "2026-11-10", totalSatang: 500,
      lines: [{ accountId: u.acc.Dining, amountSatang: 500 }] });
    expect(payment.status).toBe(201);

    for (const openingBalanceSatang of [-1_000_000_000, -1]) {
      const res = await u.agent.put(`/api/accounts/${wallet}/opening-balance`).send({ openingBalanceSatang, openingDate: "2026-11-01" });
      expect(res.status, String(openingBalanceSatang)).toBe(200);
      expect(res.body.account).toMatchObject({ id: wallet, openingBalanceSatang, balanceSatang: openingBalanceSatang - 500 });
      expect(await stored(wallet)).toBe(openingBalanceSatang);
      expect(await balanceOf(u.agent, wallet)).toBe(openingBalanceSatang - 500);
    }
  });

  it("TEST-104 refuses values below the lower bound of each type, leaving the value unchanged (AC-91, AC-19 rev. 2)", async () => {
    const u = await makeSignedInUser();
    const cases = [
      { id: u.acc.Wallet, openingBalanceSatang: -1_000_000_001 },
      { id: u.acc["Loan to Beam"], openingBalanceSatang: -1 },
      { id: u.acc["KTC Credit Card"], openingBalanceSatang: -1 },
    ];
    for (const { id, openingBalanceSatang } of cases) {
      await getPrisma().account.update({ where: { id }, data: { openingBalanceSatang: 1_000 } });
      const res = await u.agent.put(`/api/accounts/${id}/opening-balance`).send({ openingBalanceSatang, openingDate: "2026-11-01" });
      expect(res.status, `account ${id}: ${openingBalanceSatang}`).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_FAILED");
      expect(res.body.error.fields).toHaveProperty("openingBalanceSatang");
      expect(await stored(id)).toBe(1_000);
    }
  });

  it("TEST-106 the database CHECK allows a negative opening only on Cash, within range (BR-13)", async () => {
    const u = await makeSignedInUser();
    const set = (id: number, openingBalanceSatang: number) =>
      getPrisma().account.update({ where: { id }, data: { openingBalanceSatang } });

    await expect(set(u.acc.Wallet, -1_000_000_000)).resolves.toMatchObject({ openingBalanceSatang: -1_000_000_000 });
    await expect(set(u.acc["KTC Credit Card"], -1)).rejects.toThrow(/Account_openingBalance_range/);
    await expect(set(u.acc.Wallet, -1_000_000_001)).rejects.toThrow(/Account_openingBalance_range/);
    expect(await stored(u.acc.Wallet)).toBe(-1_000_000_000);
    expect(await stored(u.acc["KTC Credit Card"])).toBe(0);
  });
});
