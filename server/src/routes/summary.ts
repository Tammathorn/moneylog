import { Router } from "express";
import { getPrisma } from "../prisma.js";
import { handle, sendValidation } from "../lib/http-error.js";
import { authOf, userOnly } from "../middleware/auth.js";
import { buildSummary } from "../domain/summary.js";
import { fromDbDate, isCalendarDate } from "../domain/dates.js";

export const summaryRouter = Router();

// F-07 - AC-35..AC-37.
summaryRouter.get("/", userOnly, handle(async (req, res) => {
  const from = req.query.from, to = req.query.to;
  const fields: Record<string, string> = {};
  if (from !== undefined && !isCalendarDate(from)) fields.from = "Use YYYY-MM-DD.";
  if (to !== undefined && !isCalendarDate(to)) fields.to = "Use YYYY-MM-DD.";
  if (!Object.keys(fields).length && typeof from === "string" && typeof to === "string" && from > to) fields.from = "From must be on or before To.";
  if (Object.keys(fields).length) return sendValidation(res, fields);

  const userId = authOf(res).user.id;
  const prisma = getPrisma();
  const [accounts, txs] = await Promise.all([
    prisma.account.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.moneyTransaction.findMany({ where: { userId }, select: { kind: true, accountId: true, totalSatang: true, date: true, lines: { select: { accountId: true, amountSatang: true } } } }),
  ]);
  const transactions = txs.map((t) => ({ ...t, date: fromDbDate(t.date) }));
  res.json(buildSummary(accounts, transactions, { from: from as string | undefined, to: to as string | undefined }));
}));
