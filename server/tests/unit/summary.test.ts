import { describe, expect, it } from "vitest";
import { buildSummary, type SummaryAccount, type SummaryTransaction } from "../../src/domain/summary.js";

// The stakeholder's Sprint 1 journey (AC-35).
const accounts: SummaryAccount[] = [
  { id: 1, name: "KBank Savings", type: "CASH", subtype: "BANK", openingBalanceSatang: 1_000_000 },
  { id: 2, name: "Wallet", type: "CASH", subtype: "WALLET", openingBalanceSatang: 0 },
  { id: 3, name: "KTC Credit Card", type: "LOAN_TAKEN", subtype: "CREDIT_CARD", openingBalanceSatang: 0 },
  { id: 4, name: "Loan to Beam", type: "LOAN_GIVEN", subtype: "PERSONAL", openingBalanceSatang: 0 },
  { id: 5, name: "Salary", type: "INCOME", subtype: null, openingBalanceSatang: 0 },
  { id: 7, name: "Dining", type: "EXPENSE", subtype: null, openingBalanceSatang: 0 },
  { id: 8, name: "Groceries", type: "EXPENSE", subtype: null, openingBalanceSatang: 0 },
];
const journey: SummaryTransaction[] = [
  { kind: "RECEIPT", accountId: 1, date: "2026-11-01", totalSatang: 2_500_000, lines: [{ accountId: 5, amountSatang: 2_500_000 }] },
  { kind: "PAYMENT", accountId: 3, date: "2026-11-05", totalSatang: 185_000, lines: [{ accountId: 7, amountSatang: 65_000 }, { accountId: 8, amountSatang: 120_000 }] },
  { kind: "PAYMENT", accountId: 1, date: "2026-11-10", totalSatang: 100_000, lines: [{ accountId: 3, amountSatang: 100_000 }] },
];

describe("TEST-41 summary of the Sprint 1 journey (AC-35, BR-08)", () => {
  it("computes balances, debt, income, expenses, net and category spending", () => {
    const s = buildSummary(accounts, journey, {});
    expect(s.cash.totalSatang).toBe(3_400_000);
    expect(s.cash.accounts.find((a) => a.name === "KBank Savings")?.balanceSatang).toBe(3_400_000);
    expect(s.debt.totalSatang).toBe(85_000);
    expect(s.loansGiven.totalSatang).toBe(0);
    expect(s.incomeSatang).toBe(2_500_000);
    expect(s.expenseSatang).toBe(185_000);
    expect(s.netSatang).toBe(2_315_000);
    expect(s.categorySpending).toEqual([
      { id: 8, name: "Groceries", amountSatang: 120_000 },
      { id: 7, name: "Dining", amountSatang: 65_000 },
    ]);
  });

  it("never counts transfers, borrowing, lending, repayments or opening balances as income or expense", () => {
    const moves: SummaryTransaction[] = [
      { kind: "PAYMENT", accountId: 1, date: "2026-11-02", totalSatang: 500, lines: [{ accountId: 2, amountSatang: 500 }] }, // transfer
      { kind: "RECEIPT", accountId: 1, date: "2026-11-02", totalSatang: 700, lines: [{ accountId: 3, amountSatang: 700 }] }, // borrowing
      { kind: "PAYMENT", accountId: 1, date: "2026-11-02", totalSatang: 300, lines: [{ accountId: 4, amountSatang: 300 }] }, // lending
      { kind: "RECEIPT", accountId: 1, date: "2026-11-03", totalSatang: 100, lines: [{ accountId: 4, amountSatang: 100 }] }, // repaid to user
    ];
    const s = buildSummary(accounts, moves, {});
    expect(s.incomeSatang).toBe(0);
    expect(s.expenseSatang).toBe(0);
    expect(s.loansGiven.totalSatang).toBe(200);
    expect(s.debt.totalSatang).toBe(700);
  });
});

describe("TEST-43 (unit part) date range affects flows only (AC-36)", () => {
  it("counts only lines dated inside the inclusive range, balances stay all-time", () => {
    const s = buildSummary(accounts, journey, { from: "2026-11-05", to: "2026-11-10" });
    expect(s.incomeSatang).toBe(0);
    expect(s.expenseSatang).toBe(185_000);
    expect(s.cash.totalSatang).toBe(3_400_000);
  });
});
