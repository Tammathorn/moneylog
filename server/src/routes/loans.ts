import { Router } from "express";
import { getPrisma } from "../prisma.js";
import { handle } from "../lib/http-error.js";
import { authOf, userOnly } from "../middleware/auth.js";
import { fromDbDate } from "../domain/dates.js";
import { loanHistory, type LoanTransaction } from "../domain/loans.js";

// F-13 - AC-68..AC-71. Only the caller's accounts and transactions are read (BR-21).
export const loansRouter = Router();
loansRouter.use(userOnly);

loansRouter.get("/", handle(async (_req, res) => {
  const userId = authOf(res).user.id;
  const prisma = getPrisma();
  const [accounts, rows] = await Promise.all([
    prisma.account.findMany({ where: { userId, type: { in: ["LOAN_GIVEN", "LOAN_TAKEN"] } }, orderBy: { id: "asc" } }),
    prisma.moneyTransaction.findMany({ where: { userId }, include: { lines: { select: { accountId: true, amountSatang: true } } } }),
  ]);
  const txs: LoanTransaction[] = rows.map((t) => ({
    id: t.id, kind: t.kind, accountId: t.accountId, date: fromDbDate(t.date), createdAt: t.createdAt.toISOString(),
    description: t.description, totalSatang: t.totalSatang, lines: t.lines,
  }));
  const loans = accounts.map((a) => {
    const h = loanHistory({ id: a.id, type: a.type, openingBalanceSatang: a.openingBalanceSatang, openingDate: a.openingDate ? fromDbDate(a.openingDate) : null }, txs);
    return { type: a.type, account: { id: a.id, name: a.name, subtype: a.subtype, isActive: a.isActive }, ...h };
  }).filter((l) => l.account.isActive || l.outstandingSatang !== 0); // AC-71
  const strip = ({ type: _t, ...rest }: (typeof loans)[number]) => rest;
  const given = loans.filter((l) => l.type === "LOAN_GIVEN").map(strip);
  const taken = loans.filter((l) => l.type === "LOAN_TAKEN").map(strip);
  const sum = (list: { outstandingSatang: number }[]) => list.reduce((s, l) => s + l.outstandingSatang, 0);
  res.json({ given, taken, totalGivenSatang: sum(given), totalTakenSatang: sum(taken) });
}));
