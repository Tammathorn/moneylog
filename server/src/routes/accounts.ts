import { Router } from "express";
import { getPrisma } from "../prisma.js";
import { handle, parseId, sendError, sendNotFound, sendValidation } from "../lib/http-error.js";
import { authOf, userOnly } from "../middleware/auth.js";
import { accountDto, loadLedger } from "../lib/ledger.js";
import { isValidSatang } from "../domain/money.js";
import { isAllowedDate, toDbDate } from "../domain/dates.js";

export const accountsRouter = Router();
accountsRouter.use(userOnly);

// F-03 - AC-14.
accountsRouter.get("/", handle(async (_req, res) => {
  const { accounts, balances } = await loadLedger(getPrisma(), authOf(res).user.id);
  res.json({ accounts: accounts.map((a) => accountDto(a, balances.get(a.id) ?? 0)) });
}));

// F-04 - AC-18..AC-20, BR-06, BR-09.
accountsRouter.put("/:id/opening-balance", handle(async (req, res) => {
  const userId = authOf(res).user.id;
  const id = parseId(req.params.id);
  const prisma = getPrisma();
  const account = id === null ? null : await prisma.account.findFirst({ where: { id, userId, isActive: true } });
  if (!account) return sendNotFound(res);

  const { openingBalanceSatang, openingDate } = req.body ?? {};
  const fields: Record<string, string> = {};
  if (!isValidSatang(openingBalanceSatang, 0)) fields.openingBalanceSatang = "Enter an amount from 0.00 to 10,000,000.00.";
  if (!isAllowedDate(openingDate)) fields.openingDate = "Enter a real date from 2000-01-01 up to today.";
  if (Object.keys(fields).length) return sendValidation(res, fields);
  if (account.type === "INCOME" || account.type === "EXPENSE") {
    return sendError(res, 422, "OPENING_NOT_ALLOWED", "Income and expense accounts have no opening balance.");
  }

  await prisma.account.update({ where: { id: account.id }, data: { openingBalanceSatang, openingDate: toDbDate(openingDate) } });
  const { accounts, balances } = await loadLedger(prisma, userId);
  const updated = accounts.find((a) => a.id === account.id)!;
  res.json({ account: accountDto(updated, balances.get(updated.id) ?? 0) });
}));
