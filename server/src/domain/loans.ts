import type { AccountType, TransactionKind } from "@prisma/client";
import { headerSign, lineSign } from "./balances.js";

// F-13 Loan overview (contract docs/sprints/sprint-2/F-13-loan-overview.md §3). Pure: no DB.
// Uses the same sign tables as the balance engine, so the loan page and the balances cannot disagree (BR-07, BR-13).
export interface LoanAccount { id: number; type: AccountType; openingBalanceSatang: number; openingDate: string | null }
export interface LoanTransaction {
  id: number; kind: TransactionKind; accountId: number; date: string; createdAt: string; description: string | null;
  totalSatang: number; lines: { accountId: number; amountSatang: number }[];
}
export interface LoanRow { transactionId: number | null; date: string; kind: TransactionKind | "OPENING"; description: string | null; changeSatang: number; runningSatang: number }

// The signed effect of one transaction on one account (0 if it does not touch it).
function changeFor(account: LoanAccount, t: LoanTransaction): number {
  let change = 0;
  if (t.accountId === account.id) change += (headerSign(t.kind, account.type) ?? 0) * t.totalSatang;
  for (const l of t.lines) if (l.accountId === account.id) change += (lineSign(t.kind, account.type) ?? 0) * l.amountSatang;
  return change;
}
const touches = (account: LoanAccount, t: LoanTransaction) => t.accountId === account.id || t.lines.some((l) => l.accountId === account.id);

export function loanHistory(account: LoanAccount, txs: LoanTransaction[]): { outstandingSatang: number; history: LoanRow[] } {
  const history: LoanRow[] = [];
  let running = account.openingBalanceSatang;
  if (account.openingDate !== null || account.openingBalanceSatang !== 0) {
    history.push({ transactionId: null, date: account.openingDate ?? "", kind: "OPENING", description: "Opening balance", changeSatang: account.openingBalanceSatang, runningSatang: running });
  }
  const mine = txs.filter((t) => touches(account, t))
    .sort((x, y) => x.date.localeCompare(y.date) || x.createdAt.localeCompare(y.createdAt) || x.id - y.id);
  for (const t of mine) {
    const change = changeFor(account, t);
    running += change;
    history.push({ transactionId: t.id, date: t.date, kind: t.kind, description: t.description, changeSatang: change, runningSatang: running });
  }
  return { outstandingSatang: running, history };
}
