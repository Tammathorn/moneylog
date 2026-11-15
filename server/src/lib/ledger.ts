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
  return { accounts, transactions, balances: computeBalances(accounts, transactions) };
}

export function accountDto(a: Account, balanceSatang: number) {
  return {
    id: a.id, name: a.name, type: a.type, subtype: a.subtype,
    openingBalanceSatang: a.openingBalanceSatang,
    openingDate: a.openingDate ? fromDbDate(a.openingDate) : null,
    balanceSatang, isActive: a.isActive,
  };
}
