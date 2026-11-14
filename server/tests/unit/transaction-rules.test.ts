import { describe, expect, it } from "vitest";
import { validateTransactionRules, type RuleAccount } from "../../src/domain/transaction-rules.js";
import type { TransactionInput } from "../../src/domain/transaction-input.js";

const accounts = new Map<number, RuleAccount>([
  [1, { id: 1, type: "CASH" }], [2, { id: 2, type: "CASH" }], [3, { id: 3, type: "LOAN_TAKEN" }],
  [4, { id: 4, type: "LOAN_GIVEN" }], [5, { id: 5, type: "INCOME" }], [6, { id: 6, type: "EXPENSE" }], [7, { id: 7, type: "EXPENSE" }],
]);
const input = (over: Partial<TransactionInput>): TransactionInput => ({
  kind: "PAYMENT", accountId: 3, date: "2026-11-10", totalSatang: 185000, description: null,
  lines: [{ accountId: 6, amountSatang: 65000, note: null }, { accountId: 7, amountSatang: 120000, note: null }], ...over,
});

describe("TEST-28 allocation must equal the total (AC-25, BR-01)", () => {
  it("accepts lines that sum exactly to the total", () => {
    expect(validateTransactionRules(input({}), accounts)).toBeNull();
  });
  it("rejects lines one satang short or over", () => {
    const short = validateTransactionRules(input({ totalSatang: 185001 }), accounts);
    expect(short?.code).toBe("ALLOCATION_MISMATCH");
    expect(short?.message).toBe("Allocated ฿1,850.00 does not equal the total ฿1,850.01.");
    expect(validateTransactionRules(input({ totalSatang: 184999 }), accounts)?.code).toBe("ALLOCATION_MISMATCH");
  });
});

describe("TEST-30 header and line account types (AC-26, BR-03, BR-04)", () => {
  const notAllowed: [string, Partial<TransactionInput>][] = [
    ["payment from an expense account", { accountId: 6, lines: [{ accountId: 7, amountSatang: 185000, note: null }] }],
    ["payment from an income account", { accountId: 5, lines: [{ accountId: 7, amountSatang: 185000, note: null }] }],
    ["receipt into a loan-taken account", { kind: "RECEIPT", accountId: 3, lines: [{ accountId: 5, amountSatang: 185000, note: null }] }],
    ["payment line to an income account", { accountId: 1, lines: [{ accountId: 5, amountSatang: 185000, note: null }] }],
    ["receipt line to an expense account", { kind: "RECEIPT", accountId: 1, lines: [{ accountId: 6, amountSatang: 185000, note: null }] }],
  ];
  for (const [name, over] of notAllowed) {
    it(`rejects ${name}`, () => expect(validateTransactionRules(input(over), accounts)?.code).toBe("ACCOUNT_TYPE_NOT_ALLOWED"));
  }
  it("accepts every allowed line type for each kind", () => {
    const pay = input({ accountId: 1, totalSatang: 400, lines: [6, 3, 4, 2].map((id) => ({ accountId: id, amountSatang: 100, note: null })) });
    const rec = input({ kind: "RECEIPT", accountId: 1, totalSatang: 400, lines: [5, 4, 3, 2].map((id) => ({ accountId: id, amountSatang: 100, note: null })) });
    expect(validateTransactionRules(pay, accounts)).toBeNull();
    expect(validateTransactionRules(rec, accounts)).toBeNull();
  });
});

describe("TEST-32 no self or repeated line accounts (AC-27, BR-05)", () => {
  it("rejects a line that uses the header account", () => {
    const r = validateTransactionRules(input({ accountId: 1, totalSatang: 100, lines: [{ accountId: 1, amountSatang: 100, note: null }] }), accounts);
    expect(r?.code).toBe("DUPLICATE_LINE_ACCOUNT");
  });
  it("rejects the same account on two lines", () => {
    const r = validateTransactionRules(input({ lines: [{ accountId: 6, amountSatang: 65000, note: null }, { accountId: 6, amountSatang: 120000, note: null }] }), accounts);
    expect(r?.code).toBe("DUPLICATE_LINE_ACCOUNT");
  });
});

describe("ownership is resolved before rules (AC-29, BR-06)", () => {
  it("reports an account outside the caller's set as ACCOUNT_NOT_FOUND", () => {
    expect(validateTransactionRules(input({ accountId: 999 }), accounts)?.code).toBe("ACCOUNT_NOT_FOUND");
    expect(validateTransactionRules(input({ lines: [{ accountId: 999, amountSatang: 185000, note: null }] }), accounts)?.code).toBe("ACCOUNT_NOT_FOUND");
  });
});
