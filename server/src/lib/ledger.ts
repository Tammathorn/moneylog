import type { Account, PrismaClient } from "@prisma/client";
import { computeBalances } from "../domain/balances.js";
import { fromDbDate } from "../domain/dates.js";

// Owner-scoped loading: every query filters by userId = the caller (BR-21).
const TYPE_ORDER = ["CASH", "LOAN_TAKEN", "LOAN_GIVEN", "INCOME", "EXPENSE"];

export async function loadLedger(prisma: PrismaClient, userId: number) {
  const [accounts, transactions] = await Promise.all([
    prisma.account.findMany({ where: { userId } }),
    prisma.moneyTransaction.findMany({
      where: { userId },
      select: { kind: true, accountId: true, totalSatang: true, date: true, lines: { select: { accountId: true, amountSatang: true } } },
    }),
  ]);
  accounts.sort((x, y) => TYPE_ORDER.indexOf(x.type) - TYPE_ORDER.indexOf(y.type) || x.name.localeCompare(y.name));
  // F-09: an account is "in use" once any transaction names it as header or line (BR-17).
  const used = new Set<number>();
  for (const t of transactions) { used.add(t.accountId); for (const l of t.lines) used.add(l.accountId); }
  return { accounts, transactions, balances: computeBalances(accounts, transactions), used };
}

// The account DTO for one account of a loaded ledger.
export function ledgerAccountDto(ledger: Awaited<ReturnType<typeof loadLedger>>, a: Account) {
  return accountDto(a, ledger.balances.get(a.id) ?? 0, ledger.used.has(a.id));
}

export function accountDto(a: Account, balanceSatang: number, inUse: boolean) {
  return {
    id: a.id, name: a.name, type: a.type, subtype: a.subtype,
    openingBalanceSatang: a.openingBalanceSatang,
    openingDate: a.openingDate ? fromDbDate(a.openingDate) : null,
    balanceSatang, isActive: a.isActive, inUse,
  };
}
