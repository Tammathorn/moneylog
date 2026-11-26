import { beforeAll, describe, expect, it } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { makeSignedInUser } from "../support/fixtures.js";

// F-12 Favourites - AC-63, AC-64, BR-19.
type U = Awaited<ReturnType<typeof makeSignedInUser>>;
let a: U;
let b: U;
const pay = async (u: U, amount: number) => (await u.agent.post("/api/transactions").send({
  kind: "PAYMENT", accountId: u.acc.Wallet, date: "2026-11-10", totalSatang: amount, lines: [{ accountId: u.acc.Dining, amountSatang: amount }],
})).body.transaction.id as number;

beforeAll(async () => {
  a = await makeSignedInUser();
  b = await makeSignedInUser();
});

describe("PUT /api/transactions/:id/favourite", () => {
  it("TEST-75 marks and unmarks; rejects a non-boolean; another user's id is not found (AC-63)", async () => {
    const id = await pay(a, 5000);
    const on = await a.agent.put(`/api/transactions/${id}/favourite`).send({ isFavourite: true });
    expect(on.status).toBe(200);
    expect(on.body.transaction).toMatchObject({ id, isFavourite: true });
    const off = await a.agent.put(`/api/transactions/${id}/favourite`).send({ isFavourite: false });
    expect(off.body.transaction.isFavourite).toBe(false);
    for (const body of [{ isFavourite: "yes" }, {}]) {
      const res = await a.agent.put(`/api/transactions/${id}/favourite`).send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.fields.isFavourite).toBeDefined();
    }
    const theirs = await pay(b, 7000);
    const res = await a.agent.put(`/api/transactions/${theirs}/favourite`).send({ isFavourite: true });
    expect(res.status).toBe(404);
    expect((await getPrisma().moneyTransaction.findUniqueOrThrow({ where: { id: theirs } })).isFavourite).toBe(false);
  });
});

describe("GET /api/transactions?favourite=true", () => {
  it("TEST-76 returns only the caller's favourites (AC-64)", async () => {
    const ids = [await pay(a, 100), await pay(a, 200), await pay(a, 300)];
    await a.agent.put(`/api/transactions/${ids[0]}/favourite`).send({ isFavourite: true });
    await a.agent.put(`/api/transactions/${ids[2]}/favourite`).send({ isFavourite: true });
    const bFav = await pay(b, 400);
    await b.agent.put(`/api/transactions/${bFav}/favourite`).send({ isFavourite: true });

    const res = await a.agent.get("/api/transactions?favourite=true");
    expect(res.status).toBe(200);
    const got = res.body.items.map((t: { id: number }) => t.id);
    expect(got).toEqual(expect.arrayContaining([ids[0], ids[2]]));
    expect(got).not.toContain(ids[1]);
    expect(got).not.toContain(bFav);
    expect(res.body.items.every((t: { isFavourite: boolean }) => t.isFavourite)).toBe(true);
    expect(res.body.total).toBe(got.length);
  });
});
