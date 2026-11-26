import { beforeAll, describe, expect, it } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { replaceTransaction } from "../../src/lib/transactions-repo.js";
import { makeSignedInUser } from "../support/fixtures.js";

// F-10 Transaction correction - AC-51..AC-56 (contract docs/sprints/sprint-2/F-10-F-12-correction-favourites.md).
type U = Awaited<ReturnType<typeof makeSignedInUser>>;
let a: U;
let b: U;

const line = (accountId: number, amountSatang: number) => ({ accountId, amountSatang });
async function balances(u: U): Promise<Record<string, number>> {
  const res = await u.agent.get("/api/accounts");
  return Object.fromEntries(res.body.accounts.map((x: { name: string; balanceSatang: number }) => [x.name, x.balanceSatang]));
}
const purchase = (u: U) => ({
  kind: "PAYMENT", accountId: u.acc["KTC Credit Card"], date: "2026-11-10", totalSatang: 185000, description: "Central World",
  lines: [line(u.acc.Dining, 65000), line(u.acc.Groceries, 120000)],
});
const stored = (id: number) => getPrisma().moneyTransaction.findUnique({ where: { id }, include: { lines: { orderBy: { id: "asc" } } } });
const shape = (t: Awaited<ReturnType<typeof stored>>) => t && {
  kind: t.kind, accountId: t.accountId, date: t.date.toISOString(), totalSatang: t.totalSatang, description: t.description,
  isFavourite: t.isFavourite, lines: t.lines.map((l) => ({ accountId: l.accountId, amountSatang: l.amountSatang, note: l.note })),
};

beforeAll(async () => {
  a = await makeSignedInUser();
  b = await makeSignedInUser();
});

describe("PUT /api/transactions/:id", () => {
  it("TEST-69 replaces the header and lines and balances follow (AC-51)", async () => {
    const created = (await a.agent.post("/api/transactions").send(purchase(a))).body.transaction;
    await getPrisma().moneyTransaction.update({ where: { id: created.id }, data: { isFavourite: true } });
    const before = await balances(a);
    const expBefore = (await a.agent.get("/api/summary")).body.expenseSatang;

    const res = await a.agent.put(`/api/transactions/${created.id}`).send({
      ...purchase(a), totalSatang: 165000, lines: [line(a.acc.Dining, 65000), line(a.acc.Groceries, 100000)],
    });
    expect(res.status).toBe(200);
    expect(res.body.transaction).toMatchObject({ id: created.id, totalSatang: 165000, isFavourite: true, createdAt: created.createdAt });
    expect(res.body.transaction.updatedAt).toEqual(expect.any(String));
    const row = await stored(created.id);
    expect(row!.lines.map((l) => [l.accountId, l.amountSatang])).toEqual([[a.acc.Dining, 65000], [a.acc.Groceries, 100000]]);

    const after = await balances(a);
    expect(after["KTC Credit Card"] - before["KTC Credit Card"]).toBe(-20000);
    expect(after.Groceries - before.Groceries).toBe(-20000);
    expect(after.Dining).toBe(before.Dining);
    expect((await a.agent.get("/api/summary")).body.expenseSatang - expBefore).toBe(-20000);
  });

  it("TEST-70 an invalid edit gets the same error as a new transaction and changes nothing (AC-52)", async () => {
    const created = (await a.agent.post("/api/transactions").send(purchase(a))).body.transaction;
    const before = shape(await stored(created.id));
    const tomorrow = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
    const cases: [object, number, string][] = [
      [{ totalSatang: 185001 }, 422, "ALLOCATION_MISMATCH"],
      [{ lines: [line(a.acc.Salary, 185000)] }, 422, "ACCOUNT_TYPE_NOT_ALLOWED"],
      [{ totalSatang: 18500.5 }, 400, "VALIDATION_FAILED"],
      [{ totalSatang: 0 }, 400, "VALIDATION_FAILED"],
      [{ date: tomorrow }, 400, "VALIDATION_FAILED"],
    ];
    for (const [over, status, code] of cases) {
      const res = await a.agent.put(`/api/transactions/${created.id}`).send({ ...purchase(a), ...over });
      expect(res.status, JSON.stringify(over)).toBe(status);
      expect(res.body.error.code).toBe(code);
    }
    expect(shape(await stored(created.id))).toEqual(before);
  });

  it("TEST-71 keeps archived accounts already on the transaction, refuses other archived ones (AC-53)", async () => {
    const created = (await a.agent.post("/api/transactions").send(purchase(a))).body.transaction;
    await a.agent.patch(`/api/accounts/${a.acc.Electricity}`).send({ isActive: false });
    await a.agent.patch(`/api/accounts/${a.acc.Dining}`).send({ isActive: false });
    const keep = await a.agent.put(`/api/transactions/${created.id}`).send({ ...purchase(a), description: "Central World (fixed)" });
    expect(keep.status).toBe(200);
    const swap = await a.agent.put(`/api/transactions/${created.id}`).send({
      ...purchase(a), lines: [line(a.acc.Dining, 65000), line(a.acc.Electricity, 120000)],
    });
    expect(swap.status).toBe(422);
    expect(swap.body.error.code).toBe("ACCOUNT_ARCHIVED");
    await a.agent.patch(`/api/accounts/${a.acc.Electricity}`).send({ isActive: true });
    await a.agent.patch(`/api/accounts/${a.acc.Dining}`).send({ isActive: true });
  });
});

describe("DELETE /api/transactions/:id", () => {
  it("TEST-72 removes the transaction and its lines; balances and summary go back (AC-54)", async () => {
    const before = await balances(a);
    const summaryBefore = (await a.agent.get("/api/summary")).body;
    const created = (await a.agent.post("/api/transactions").send({
      kind: "RECEIPT", accountId: a.acc["KBank Savings"], date: "2026-11-10", totalSatang: 2_500_000, lines: [line(a.acc.Salary, 2_500_000)],
    })).body.transaction;
    expect((await balances(a))["KBank Savings"]).toBe(before["KBank Savings"] + 2_500_000);

    const res = await a.agent.delete(`/api/transactions/${created.id}`);
    expect(res.status).toBe(204);
    expect(await getPrisma().transactionLine.count({ where: { transactionId: created.id } })).toBe(0);
    expect(await balances(a)).toEqual(before);
    const summaryAfter = (await a.agent.get("/api/summary")).body;
    expect(summaryAfter.incomeSatang).toBe(summaryBefore.incomeSatang);
    expect(summaryAfter.cash.totalSatang).toBe(summaryBefore.cash.totalSatang);
    expect((await a.agent.get(`/api/transactions/${created.id}`)).status).toBe(404);
  });
});

describe("Ownership", () => {
  it("TEST-73 another user's, unknown or malformed id is not found and nothing changes (AC-55, BR-19, BR-21)", async () => {
    const theirs = (await b.agent.post("/api/transactions").send(purchase(b))).body.transaction;
    const before = shape(await stored(theirs.id));
    for (const id of [theirs.id, 999999, "abc"]) {
      const put = await a.agent.put(`/api/transactions/${id}`).send(purchase(a));
      const del = await a.agent.delete(`/api/transactions/${id}`);
      const fav = await a.agent.put(`/api/transactions/${id}/favourite`).send({ isFavourite: true });
      for (const res of [put, del, fav]) {
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe("NOT_FOUND");
      }
    }
    expect(shape(await stored(theirs.id))).toEqual(before);
  });
});

describe("Atomic edit", () => {
  it("TEST-74 a failure while writing the new lines keeps the old header and lines (AC-56, NFR-05)", async () => {
    const created = (await a.agent.post("/api/transactions").send(purchase(a))).body.transaction;
    const before = shape(await stored(created.id));
    await expect(replaceTransaction(getPrisma(), created.id, {
      kind: "PAYMENT", accountId: a.acc["KTC Credit Card"], date: "2026-11-11", totalSatang: 185000, description: "broken",
      lines: [{ accountId: a.acc.Dining, amountSatang: 65000, note: null }, { accountId: 999_999, amountSatang: 120000, note: null }],
    })).rejects.toThrow();
    expect(shape(await stored(created.id))).toEqual(before);
  });
});
