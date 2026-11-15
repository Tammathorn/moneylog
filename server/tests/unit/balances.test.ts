import { describe, expect, it } from "vitest";
import { computeBalances, type BalanceAccount, type BalanceTransaction } from "../../src/domain/balances.js";

const A: BalanceAccount[] = [
  { id: 1, type: "CASH", openingBalanceSatang: 0 },        // bank
  { id: 2, type: "CASH", openingBalanceSatang: 0 },        // wallet
  { id: 3, type: "LOAN_TAKEN", openingBalanceSatang: 0 },  // card
  { id: 4, type: "LOAN_GIVEN", openingBalanceSatang: 0 },  // loan to friend
  { id: 5, type: "INCOME", openingBalanceSatang: 0 },
  { id: 6, type: "EXPENSE", openingBalanceSatang: 0 },
];
const pay = (accountId: number, lines: [number, number][]): BalanceTransaction => ({
  kind: "PAYMENT", accountId, totalSatang: lines.reduce((s, [, a]) => s + a, 0),
  lines: lines.map(([id, amountSatang]) => ({ accountId: id, amountSatang })),
});
const rec = (accountId: number, lines: [number, number][]): BalanceTransaction => ({ ...pay(accountId, lines), kind: "RECEIPT" });

describe("TEST-17 balance effects for every kind and account type (AC-15, BR-07)", () => {
  // [description, transaction, expected change per account id]
  const cases: [string, BalanceTransaction, Record<number, number>][] = [
    ["payment from cash to expense", pay(1, [[6, 100]]), { 1: -100, 6: 100 }],
    ["card charge to expense (debt grows)", pay(3, [[6, 100]]), { 3: 100, 6: 100 }],
    ["payment repays a loan taken", pay(1, [[3, 100]]), { 1: -100, 3: -100 }],
    ["payment lends money (loan given)", pay(1, [[4, 100]]), { 1: -100, 4: 100 }],
    ["payment transfers cash to cash", pay(1, [[2, 100]]), { 1: -100, 2: 100 }],
    ["receipt of income", rec(1, [[5, 100]]), { 1: 100, 5: 100 }],
    ["receipt repays a loan given", rec(1, [[4, 100]]), { 1: 100, 4: -100 }],
    ["receipt of new borrowing", rec(1, [[3, 100]]), { 1: 100, 3: 100 }],
    ["receipt transfers cash from cash", rec(1, [[2, 100]]), { 1: 100, 2: -100 }],
  ];
  for (const [name, tx, expected] of cases) {
    it(name, () => {
      const balances = computeBalances(A, [tx]);
      for (const acc of A) expect(balances.get(acc.id), `account ${acc.id}`).toBe(expected[acc.id] ?? 0);
    });
  }
});

describe("TEST-19 balance = opening + effects, exactly (AC-16, BR-13, NFR-04)", () => {
  it("adds 0.10 + 0.20 THB to an opening of 0.10 THB as exactly 40 satang", () => {
    const accounts: BalanceAccount[] = [{ id: 1, type: "CASH", openingBalanceSatang: 10 }, { id: 5, type: "INCOME", openingBalanceSatang: 0 }];
    const b = computeBalances(accounts, [rec(1, [[5, 10]]), rec(1, [[5, 20]])]);
    expect(b.get(1)).toBe(40);
    expect(b.get(5)).toBe(30);
  });
  it("lets a cash balance go negative (BR-14)", () => {
    const accounts: BalanceAccount[] = [{ id: 1, type: "CASH", openingBalanceSatang: 0 }, { id: 6, type: "EXPENSE", openingBalanceSatang: 0 }];
    expect(computeBalances(accounts, [pay(1, [[6, 500]])]).get(1)).toBe(-500);
  });
});
