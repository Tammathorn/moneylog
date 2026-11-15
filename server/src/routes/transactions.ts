import { Router } from "express";
import { getPrisma } from "../prisma.js";
import { handle, parseId, sendError, sendNotFound, sendValidation } from "../lib/http-error.js";
import { authOf, userOnly } from "../middleware/auth.js";
import { parseTransactionInput } from "../domain/transaction-input.js";
import { validateTransactionRules } from "../domain/transaction-rules.js";
import { insertTransaction, transactionDto, transactionInclude } from "../lib/transactions-repo.js";

export const transactionsRouter = Router();
transactionsRouter.use(userOnly);

// F-05 - check order in the contract section 3.
transactionsRouter.post("/", handle(async (req, res) => {
  const parsed = parseTransactionInput(req.body);
  if (!parsed.ok) return sendValidation(res, parsed.fields);
  const userId = authOf(res).user.id;
  const prisma = getPrisma();
  const own = await prisma.account.findMany({ where: { userId, isActive: true }, select: { id: true, type: true } });
  const ruleError = validateTransactionRules(parsed.value, new Map(own.map((a) => [a.id, a])));
  if (ruleError) return sendError(res, 422, ruleError.code, ruleError.message);

  const id = await insertTransaction(prisma, userId, parsed.value);
  const saved = await prisma.moneyTransaction.findUniqueOrThrow({ where: { id }, include: transactionInclude });
  res.status(201).json({ transaction: transactionDto(saved) });
}));

// F-06 - AC-32, BR-15.
transactionsRouter.get("/", handle(async (req, res) => {
  const limit = Math.min(Math.max(Number.parseInt(String(req.query.limit ?? "50"), 10) || 50, 1), 100);
  const offset = Math.max(Number.parseInt(String(req.query.offset ?? "0"), 10) || 0, 0);
  const where = { userId: authOf(res).user.id };
  const prisma = getPrisma();
  const [items, total] = await Promise.all([
    prisma.moneyTransaction.findMany({ where, include: transactionInclude, orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }], take: limit, skip: offset }),
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
