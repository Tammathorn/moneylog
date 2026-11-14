import type { AccountSubtype, AccountType } from "@prisma/client";
import { computeBalances, type BalanceTransaction } from "./balances.js";

// F-07 - FR-10, BR-08. Pure function over the caller's own data.
export interface SummaryAccount { id: number; name: string; type: AccountType; subtype: AccountSubtype | null; openingBalanceSatang: number }
export interface SummaryTransaction extends BalanceTransaction { date: string }
export interface DateRange { from?: string; to?: string }

export function buildSummary(accounts: SummaryAccount[], transactions: SummaryTransaction[], range: DateRange) {
  // Balances are always current (all time).
  const balances = computeBalances(accounts, transactions);
  const group = (type: AccountType) => {
    const list = accounts.filter((a) => a.type === type)
      .map((a) => ({ id: a.id, name: a.name, subtype: a.subtype, balanceSatang: balances.get(a.id) ?? 0 }));
    return { totalSatang: list.reduce((s, a) => s + a.balanceSatang, 0), accounts: list };
  };

  // Flows: only lines to INCOME / EXPENSE accounts, only inside the range (BR-08).
  const typeOf = new Map(accounts.map((a) => [a.id, a.type]));
  const inRange = (d: string) => (!range.from || d >= range.from) && (!range.to || d <= range.to);
  const flow = new Map<number, number>();
  for (const tx of transactions) {
    if (!inRange(tx.date)) continue;
    for (const l of tx.lines) {
      const t = typeOf.get(l.accountId);
      if (t === "INCOME" || t === "EXPENSE") flow.set(l.accountId, (flow.get(l.accountId) ?? 0) + l.amountSatang);
    }
  }
  const perType = (type: AccountType) => accounts
    .filter((a) => a.type === type && (flow.get(a.id) ?? 0) > 0)
    .map((a) => ({ id: a.id, name: a.name, amountSatang: flow.get(a.id)! }))
    .sort((x, y) => y.amountSatang - x.amountSatang || x.name.localeCompare(y.name));
  const categorySpending = perType("EXPENSE");
  const incomeBySource = perType("INCOME");
  const incomeSatang = incomeBySource.reduce((s, x) => s + x.amountSatang, 0);
  const expenseSatang = categorySpending.reduce((s, x) => s + x.amountSatang, 0);

  return {
    cash: group("CASH"), debt: group("LOAN_TAKEN"), loansGiven: group("LOAN_GIVEN"),
    incomeSatang, expenseSatang, netSatang: incomeSatang - expenseSatang,
    categorySpending, incomeBySource,
    range: { from: range.from ?? null, to: range.to ?? null },
  };
}
