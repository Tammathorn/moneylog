import { describe, expect, it } from "vitest";
import { computeBalances } from "../../src/domain/balances.js";
import { loanHistory, type LoanAccount, type LoanTransaction } from "../../src/domain/loans.js";

// TEST-87 - F-13 loan history (contract docs/sprints/sprint-2/F-13-loan-overview.md §3).
const beam: LoanAccount = { id: 4, type: "LOAN_GIVEN", openingBalanceSatang: 50_000, openingDate: "2026-10-01" };
const card: LoanAccount = { id: 3, type: "LOAN_TAKEN", openingBalanceSatang: 0, openingDate: null };
const types = [{ id: 1, type: "CASH" as const, openingBalanceSatang: 0 }, { id: 6, type: "EXPENSE" as const, openingBalanceSatang: 0 }, { id: 7, type: "EXPENSE" as const, openingBalanceSatang: 0 }];
const tx = (id: number, kind: "PAYMENT" | "RECEIPT", accountId: number, date: string, lines: [number, number][], createdAt = `${date}T01:00:00Z`): LoanTransaction => ({
  id, kind, accountId, date, createdAt, description: `tx ${id}`, totalSatang: lines.reduce((s, [, a]) => s + a, 0),
  lines: lines.map(([a, amountSatang]) => ({ accountId: a, amountSatang })),
});

const TXS: LoanTransaction[] = [
  tx(15, "RECEIPT", 1, "2026-11-20", [[4, 200_000]]),             // Beam pays back 2,000.00
  tx(12, "PAYMENT", 1, "2026-11-05", [[4, 500_000]]),             // lend Beam 5,000.00
  tx(20, "PAYMENT", 3, "2026-11-10", [[6, 65_000], [7, 120_000]]), // card purchase 1,850.00
  tx(21, "PAYMENT", 1, "2026-11-15", [[3, 100_000]]),             // card repayment 1,000.00
  tx(22, "PAYMENT", 1, "2026-11-15", [[6, 5_000]], "2026-11-15T00:00:00Z"), // unrelated
];

describe("TEST-87 loanHistory (AC-68, AC-69)", () => {
  it("Loan Given: opening first, then lend (+) and repayment (−) in date order with a running balance", () => {
    const h = loanHistory(beam, TXS);
    expect(h.history).toEqual([
      { transactionId: null, date: "2026-10-01", kind: "OPENING", description: "Opening balance", changeSatang: 50_000, runningSatang: 50_000 },
      { transactionId: 12, date: "2026-11-05", kind: "PAYMENT", description: "tx 12", changeSatang: 500_000, runningSatang: 550_000 },
      { transactionId: 15, date: "2026-11-20", kind: "RECEIPT", description: "tx 15", changeSatang: -200_000, runningSatang: 350_000 },
    ]);
    expect(h.outstandingSatang).toBe(350_000);
  });

  it("Loan Taken: a card charge as header (+) and a repayment as line (−)", () => {
    const h = loanHistory(card, TXS);
    expect(h.history.map((r) => [r.transactionId, r.changeSatang, r.runningSatang])).toEqual([[20, 185_000, 185_000], [21, -100_000, 85_000]]);
    expect(h.outstandingSatang).toBe(85_000);
  });

  it("the outstanding always equals the balance engine (BR-07, BR-13)", () => {
    const engine = computeBalances([...types, beam, card], TXS);
    expect(loanHistory(beam, TXS).outstandingSatang).toBe(engine.get(4));
    expect(loanHistory(card, TXS).outstandingSatang).toBe(engine.get(3));
  });

  it("orders same-day rows by creation time, then id", () => {
    const same = [tx(31, "PAYMENT", 1, "2026-11-05", [[4, 100]], "2026-11-05T02:00:00Z"), tx(30, "PAYMENT", 1, "2026-11-05", [[4, 200]], "2026-11-05T01:00:00Z")];
    expect(loanHistory({ ...beam, openingBalanceSatang: 0, openingDate: null }, same).history.map((r) => r.transactionId)).toEqual([30, 31]);
  });

  it("an account with no opening and no transactions has an empty history and 0 outstanding", () => {
    expect(loanHistory({ id: 9, type: "LOAN_GIVEN", openingBalanceSatang: 0, openingDate: null }, TXS)).toEqual({ outstandingSatang: 0, history: [] });
  });
});
