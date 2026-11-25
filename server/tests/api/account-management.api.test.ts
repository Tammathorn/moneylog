import { beforeAll, describe, expect, it } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { makeSignedInUser } from "../support/fixtures.js";

// F-09 Account management - AC-43..AC-49 (contract docs/sprints/sprint-2/F-09-account-management.md).
type U = Awaited<ReturnType<typeof makeSignedInUser>>;
let a: U;
let b: U;

const accountsOf = async (u: U) => (await u.agent.get("/api/accounts")).body.accounts as
  { id: number; name: string; type: string; subtype: string | null; balanceSatang: number; isActive: boolean; inUse: boolean }[];
const countFor = (userId: number) => getPrisma().account.count({ where: { userId } });
const txCount = (userId: number) => getPrisma().moneyTransaction.count({ where: { userId } });
const salary = (u: U, into: number, amount = 2_500_000) => u.agent.post("/api/transactions").send({
  kind: "RECEIPT", accountId: into, date: "2026-11-10", totalSatang: amount, lines: [{ accountId: u.acc.Salary, amountSatang: amount }],
});

beforeAll(async () => {
  a = await makeSignedInUser();
  b = await makeSignedInUser();
});

describe("POST /api/accounts", () => {
  it("TEST-62 creates an owned account with balance 0 (AC-43)", async () => {
    const res = await a.agent.post("/api/accounts").send({ name: "SCB Savings", type: "CASH", subtype: "BANK" });
    expect(res.status).toBe(201);
    expect(res.body.account).toMatchObject({ name: "SCB Savings", type: "CASH", subtype: "BANK", balanceSatang: 0, isActive: true, inUse: false });
    const row = await getPrisma().account.findUniqueOrThrow({ where: { id: res.body.account.id } });
    expect(row.userId).toBe(a.user.id);
    expect((await accountsOf(a)).map((x) => x.id)).toContain(row.id);
    expect((await accountsOf(b)).map((x) => x.id)).not.toContain(row.id);
  });

  it("TEST-62 rejects invalid bodies with the field named and creates nothing (AC-44)", async () => {
    const before = await countFor(a.user.id);
    const bad: [object, string][] = [
      [{ name: "", type: "EXPENSE" }, "name"],
      [{ name: "   ", type: "EXPENSE" }, "name"],
      [{ name: "x".repeat(61), type: "EXPENSE" }, "name"],
      [{ name: "Thing", type: "SAVINGS" }, "type"],
      [{ name: "Thing", type: "CASH" }, "subtype"],
      [{ name: "Thing", type: "CASH", subtype: "CREDIT_CARD" }, "subtype"],
      [{ name: "Thing", type: "INCOME", subtype: "BANK" }, "subtype"],
    ];
    for (const [body, field] of bad) {
      const res = await a.agent.post("/api/accounts").send(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_FAILED");
      expect(res.body.error.fields[field]).toBeDefined();
    }
    expect(await countFor(a.user.id)).toBe(before);
    const ok = await a.agent.post("/api/accounts").send({ name: "y".repeat(60), type: "EXPENSE" });
    expect(ok.status).toBe(201);
  });
});

describe("Unique names and rename", () => {
  it("TEST-63 refuses a duplicate name ignoring case and spaces; other users may reuse it (AC-45)", async () => {
    const dup = await a.agent.post("/api/accounts").send({ name: " kbank savings ", type: "CASH", subtype: "BANK" });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("ACCOUNT_NAME_TAKEN");
    const rename = await a.agent.patch(`/api/accounts/${a.acc.Wallet}`).send({ name: "KBANK SAVINGS" });
    expect(rename.status).toBe(409);
    // A created "SCB Savings" in TEST-62; names are unique per user, so B may use it too.
    const bSame = await b.agent.post("/api/accounts").send({ name: "SCB Savings", type: "CASH", subtype: "BANK" });
    expect(bSame.status).toBe(201);
  });

  it("TEST-63 a duplicate name also counts archived accounts (AC-45)", async () => {
    const made = await a.agent.post("/api/accounts").send({ name: "Old Card", type: "LOAN_TAKEN", subtype: "CREDIT_CARD" });
    await a.agent.patch(`/api/accounts/${made.body.account.id}`).send({ isActive: false });
    const dup = await a.agent.post("/api/accounts").send({ name: "old card", type: "LOAN_TAKEN", subtype: "CREDIT_CARD" });
    expect(dup.status).toBe(409);
  });

  it("TEST-63 renames, and the new name shows on existing transactions (AC-46)", async () => {
    const tx = await salary(a, a.acc["KBank Savings"]);
    expect(tx.status).toBe(201);
    const res = await a.agent.patch(`/api/accounts/${a.acc["KBank Savings"]}`).send({ name: "KBank Main" });
    expect(res.status).toBe(200);
    expect(res.body.account.name).toBe("KBank Main");
    const detail = await a.agent.get(`/api/transactions/${tx.body.transaction.id}`);
    expect(detail.body.transaction.account.name).toBe("KBank Main");
    await a.agent.patch(`/api/accounts/${a.acc["KBank Savings"]}`).send({ name: "KBank Savings" });
  });

  it("TEST-63 another user's account id is not found and stays unchanged (AC-46, BR-21)", async () => {
    const res = await a.agent.patch(`/api/accounts/${b.acc.Wallet}`).send({ name: "Mine now" });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
    expect((await getPrisma().account.findUniqueOrThrow({ where: { id: b.acc.Wallet } })).name).toBe("Wallet");
  });
});

describe("Archive and restore", () => {
  it("TEST-64 an archived account keeps its balance and summary, but new use is refused (AC-47, BR-16)", async () => {
    const id = a.acc.Wallet;
    expect((await salary(a, id, 100_000)).status).toBe(201);
    const before = (await accountsOf(a)).find((x) => x.id === id)!;
    const summaryBefore = (await a.agent.get("/api/summary")).body;

    const arch = await a.agent.patch(`/api/accounts/${id}`).send({ isActive: false });
    expect(arch.status).toBe(200);
    expect(arch.body.account).toMatchObject({ isActive: false, balanceSatang: before.balanceSatang });
    const summaryAfter = (await a.agent.get("/api/summary")).body;
    expect(summaryAfter.cash.totalSatang).toBe(summaryBefore.cash.totalSatang);
    expect(summaryAfter.incomeSatang).toBe(summaryBefore.incomeSatang);

    const txBefore = await txCount(a.user.id);
    const asHeader = await salary(a, id, 5_000);
    expect(asHeader.status).toBe(422);
    expect(asHeader.body.error.code).toBe("ACCOUNT_ARCHIVED");
    const asLine = await a.agent.post("/api/transactions").send({
      kind: "PAYMENT", accountId: a.acc["KBank Savings"], date: "2026-11-10", totalSatang: 5_000, lines: [{ accountId: id, amountSatang: 5_000 }],
    });
    expect(asLine.status).toBe(422);
    expect(asLine.body.error.code).toBe("ACCOUNT_ARCHIVED");
    const opening = await a.agent.put(`/api/accounts/${id}/opening-balance`).send({ openingBalanceSatang: 1000, openingDate: "2026-11-01" });
    expect(opening.status).toBe(422);
    expect(opening.body.error.code).toBe("ACCOUNT_ARCHIVED");
    expect(await txCount(a.user.id)).toBe(txBefore);

    const restore = await a.agent.patch(`/api/accounts/${id}`).send({ isActive: true });
    expect(restore.status).toBe(200);
    expect((await salary(a, id, 5_000)).status).toBe(201);
  });
});

describe("DELETE /api/accounts/:id", () => {
  it("TEST-65 deletes an unused account (AC-48)", async () => {
    const made = await a.agent.post("/api/accounts").send({ name: "Temp", type: "EXPENSE" });
    const res = await a.agent.delete(`/api/accounts/${made.body.account.id}`);
    expect(res.status).toBe(204);
    expect(await getPrisma().account.findUnique({ where: { id: made.body.account.id } })).toBeNull();
  });

  it("TEST-65 refuses to delete an account used as header or line (AC-48, BR-17)", async () => {
    const pay = await a.agent.post("/api/transactions").send({
      kind: "PAYMENT", accountId: a.acc["KBank Savings"], date: "2026-11-10", totalSatang: 65000, lines: [{ accountId: a.acc.Dining, amountSatang: 65000 }],
    });
    expect(pay.status).toBe(201);
    for (const id of [a.acc["KBank Savings"], a.acc.Dining]) {
      const res = await a.agent.delete(`/api/accounts/${id}`);
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("ACCOUNT_IN_USE");
      expect(await getPrisma().account.findUnique({ where: { id } })).not.toBeNull();
    }
    expect((await accountsOf(a)).find((x) => x.id === a.acc.Dining)!.inUse).toBe(true);
  });

  it("TEST-65 another user's account id is not found (AC-48)", async () => {
    const res = await a.agent.delete(`/api/accounts/${b.acc.Telecom}`);
    expect(res.status).toBe(404);
    expect(await getPrisma().account.findUnique({ where: { id: b.acc.Telecom } })).not.toBeNull();
  });
});

describe("Type change", () => {
  it("TEST-66 allows a type change only while unused and without opening balance (AC-49, BR-17)", async () => {
    const made = await a.agent.post("/api/accounts").send({ name: "Maybe Card", type: "CASH", subtype: "WALLET" });
    const id = made.body.account.id;
    const ok = await a.agent.patch(`/api/accounts/${id}`).send({ type: "LOAN_TAKEN", subtype: "CREDIT_CARD" });
    expect(ok.status).toBe(200);
    expect(ok.body.account).toMatchObject({ type: "LOAN_TAKEN", subtype: "CREDIT_CARD" });

    await a.agent.put(`/api/accounts/${id}/opening-balance`).send({ openingBalanceSatang: 5000, openingDate: "2026-11-01" });
    const withOpening = await a.agent.patch(`/api/accounts/${id}`).send({ type: "CASH", subtype: "BANK" });
    expect(withOpening.status).toBe(422);
    expect(withOpening.body.error.code).toBe("ACCOUNT_TYPE_LOCKED");

    const used = await a.agent.patch(`/api/accounts/${a.acc.Dining}`).send({ type: "INCOME" });
    expect(used.status).toBe(422);
    expect(used.body.error.code).toBe("ACCOUNT_TYPE_LOCKED");
    expect((await getPrisma().account.findUniqueOrThrow({ where: { id: a.acc.Dining } })).type).toBe("EXPENSE");
  });
});
