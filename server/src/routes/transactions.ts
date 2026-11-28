import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { parseHistoryFilter } from "../domain/history-filter.js";
import { toDbDate } from "../domain/dates.js";
import { getPrisma } from "../prisma.js";
import { handle, parseId, sendError, sendNotFound, sendValidation } from "../lib/http-error.js";
import { authOf, userOnly } from "../middleware/auth.js";
import { parseTransactionInput } from "../domain/transaction-input.js";
import { archivedAccountUse, editableAccounts, usableAccounts, validateTransactionRules } from "../domain/transaction-rules.js";
import { insertTransaction, replaceTransaction, transactionDto, transactionInclude } from "../lib/transactions-repo.js";

export const transactionsRouter = Router();
transactionsRouter.use(userOnly);

// F-05 - check order in the contract section 3.
transactionsRouter.post("/", handle(async (req, res) => {
  const parsed = parseTransactionInput(req.body);
  if (!parsed.ok) return sendValidation(res, parsed.fields);
  const userId = authOf(res).user.id;
  const prisma = getPrisma();
  const own = await prisma.account.findMany({ where: { userId }, select: { id: true, type: true, name: true, isActive: true } });
  const ruleError = archivedAccountUse(parsed.value, own) ?? validateTransactionRules(parsed.value, usableAccounts(own));
  if (ruleError) return sendError(res, 422, ruleError.code, ruleError.message);

  const id = await insertTransaction(prisma, userId, parsed.value);
  const saved = await prisma.moneyTransaction.findUniqueOrThrow({ where: { id }, include: transactionInclude });
  res.status(201).json({ transaction: transactionDto(saved) });
}));

// F-06 - AC-32, BR-15; F-11 - AC-58..AC-61: every filter runs in the DB and always starts with the caller's userId.
transactionsRouter.get("/", handle(async (req, res) => {
  const parsed = parseHistoryFilter(req.query as Record<string, unknown>);
  if (!parsed.ok) return sendValidation(res, parsed.fields);
  const f = parsed.value;
  const where: Prisma.MoneyTransactionWhereInput = { userId: authOf(res).user.id };
  const and: Prisma.MoneyTransactionWhereInput[] = [];
  if (f.from || f.to) where.date = { ...(f.from && { gte: toDbDate(f.from) }), ...(f.to && { lte: toDbDate(f.to) }) };
  if (f.kind) where.kind = f.kind;
  if (f.favourite) where.isFavourite = true;
  if (f.minSatang !== undefined || f.maxSatang !== undefined) {
    where.totalSatang = { ...(f.minSatang !== undefined && { gte: f.minSatang }), ...(f.maxSatang !== undefined && { lte: f.maxSatang }) };
  }
  if (f.accountId) and.push({ OR: [{ accountId: f.accountId }, { lines: { some: { accountId: f.accountId } } }] });
  if (f.q) {
    and.push({ OR: [
      { description: { contains: f.q, mode: "insensitive" } },
      { lines: { some: { note: { contains: f.q, mode: "insensitive" } } } },
    ] });
  }
  if (and.length) where.AND = and;
  const prisma = getPrisma();
  const [items, total] = await Promise.all([
    prisma.moneyTransaction.findMany({ where, include: transactionInclude, orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }], take: f.limit, skip: f.offset }),
    prisma.moneyTransaction.count({ where }),
  ]);
  res.json({ items: items.map(transactionDto), total });
}));

// F-06 - AC-33: another user's id is answered exactly like a missing one.
transactionsRouter.get("/:id", handle(async (req, res) => {
  const id = parseId(req.params.id);
  const tx = id === null ? null : await getPrisma().moneyTransaction.findFirst({ where: { id, userId: authOf(res).user.id }, include: transactionInclude });
  if (!tx) return sendNotFound(res);
  res.json({ transaction: transactionDto(tx) });
}));

// Owner-scoped lookup used by edit, delete and favourite (BR-19, BR-21): another user's id = 404.
async function ownTransaction(rawId: string, userId: number) {
  const id = parseId(rawId);
  return id === null ? null : getPrisma().moneyTransaction.findFirst({ where: { id, userId }, include: { lines: { select: { accountId: true } } } });
}

// F-10 - AC-51..AC-53: the whole transaction is validated again like a new one, then replaced atomically.
transactionsRouter.put("/:id", handle(async (req, res) => {
  const userId = authOf(res).user.id;
  const saved = await ownTransaction(req.params.id, userId);
  if (!saved) return sendNotFound(res);
  const parsed = parseTransactionInput(req.body);
  if (!parsed.ok) return sendValidation(res, parsed.fields);
  const prisma = getPrisma();
  const own = await prisma.account.findMany({ where: { userId }, select: { id: true, type: true, name: true, isActive: true } });
  const { usable, keep } = editableAccounts(own, saved);
  const ruleError = archivedAccountUse(parsed.value, own, keep) ?? validateTransactionRules(parsed.value, usable);
  if (ruleError) return sendError(res, 422, ruleError.code, ruleError.message);

  await replaceTransaction(prisma, saved.id, parsed.value);
  const tx = await prisma.moneyTransaction.findUniqueOrThrow({ where: { id: saved.id }, include: transactionInclude });
  res.json({ transaction: transactionDto(tx) });
}));

// F-10 - AC-54: lines go with the header (onDelete: Cascade); balances are derived, so they follow.
transactionsRouter.delete("/:id", handle(async (req, res) => {
  const saved = await ownTransaction(req.params.id, authOf(res).user.id);
  if (!saved) return sendNotFound(res);
  await getPrisma().moneyTransaction.delete({ where: { id: saved.id } });
  res.status(204).end();
}));

// F-12 - AC-63.
transactionsRouter.put("/:id/favourite", handle(async (req, res) => {
  const saved = await ownTransaction(req.params.id, authOf(res).user.id);
  if (!saved) return sendNotFound(res);
  const { isFavourite } = req.body ?? {};
  if (typeof isFavourite !== "boolean") return sendValidation(res, { isFavourite: "isFavourite must be true or false." });
  const tx = await getPrisma().moneyTransaction.update({ where: { id: saved.id }, data: { isFavourite }, include: transactionInclude });
  res.json({ transaction: transactionDto(tx) });
}));
