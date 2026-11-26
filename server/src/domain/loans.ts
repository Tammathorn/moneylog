import type { AccountType, TransactionKind } from "@prisma/client";

// F-13 (contract §3). Stub committed with the tests (TDD red); implemented next.
export interface LoanAccount { id: number; type: AccountType; openingBalanceSatang: number; openingDate: string | null }
export interface LoanTransaction {
  id: number; kind: TransactionKind; accountId: number; date: string; createdAt: string; description: string | null;
  totalSatang: number; lines: { accountId: number; amountSatang: number }[];
}
export interface LoanRow { transactionId: number | null; date: string; kind: TransactionKind | "OPENING"; description: string | null; changeSatang: number; runningSatang: number }
export function loanHistory(_account: LoanAccount, _txs: LoanTransaction[]): { outstandingSatang: number; history: LoanRow[] } {
  return { outstandingSatang: 0, history: [] };
}
