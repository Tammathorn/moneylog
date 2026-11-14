// Skeleton only - implemented in the next commit (TDD red step).
import type { AccountSubtype, AccountType } from "@prisma/client";
import type { BalanceTransaction } from "./balances.js";
export interface SummaryAccount { id: number; name: string; type: AccountType; subtype: AccountSubtype | null; openingBalanceSatang: number }
export interface SummaryTransaction extends BalanceTransaction { date: string }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildSummary(_a: SummaryAccount[], _t: SummaryTransaction[], _r: { from?: string; to?: string }): any {
  return { cash: { totalSatang: 0, accounts: [] }, debt: { totalSatang: 0 }, loansGiven: { totalSatang: 0 }, incomeSatang: 0, expenseSatang: 0, netSatang: 0, categorySpending: [] };
}
