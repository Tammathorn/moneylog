import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { handle, parseId, sendError, sendNotFound, sendValidation } from "../lib/http-error.js";
import { authOf, userOnly } from "../middleware/auth.js";
import { ledgerAccountDto, loadLedger } from "../lib/ledger.js";
import { isValidSatang, MAX_SATANG } from "../domain/money.js";
import { isAllowedDate, toDbDate } from "../domain/dates.js";
import { parseAccountInput, parseAccountPatch, sameName } from "../domain/account-rules.js";

export const accountsRouter = Router();
accountsRouter.use(userOnly);

const archivedError = (name: string) => ({ code: "ACCOUNT_ARCHIVED", message: `${name} is archived. Restore it or choose another account.` });

async function accountResponse(userId: number, id: number) {
  const ledger = await loadLedger(getPrisma(), userId);
  return ledgerAccountDto(ledger, ledger.accounts.find((a) => a.id === id)!);
}

// Step 6 (F-09 §3): unique per user, archived included, trimmed and case-insensitive (AC-45).
async function nameTaken(userId: number, name: string, exceptId?: number) {
  const own = await getPrisma().account.findMany({ where: { userId }, select: { id: true, name: true } });
  return own.some((a) => a.id !== exceptId && sameName(a.name, name));
}

async function isInUse(accountId: number) {
  const db = getPrisma();
  const [asHeader, asLine] = await Promise.all([
    db.moneyTransaction.count({ where: { accountId } }),
    db.transactionLine.count({ where: { accountId } }),
  ]);
  return asHeader + asLine > 0;
}

const nameTakenError = (name: string) => ({ code: "ACCOUNT_NAME_TAKEN", message: `You already have an account called ${name}.` });

// F-03 - AC-14 (archived accounts included with isActive false, F-09).
accountsRouter.get("/", handle(async (_req, res) => {
  const ledger = await loadLedger(getPrisma(), authOf(res).user.id);
  res.json({ accounts: ledger.accounts.map((a) => ledgerAccountDto(ledger, a)) });
}));

// F-09 - AC-43..AC-45.
accountsRouter.post("/", handle(async (req, res) => {
  const parsed = parseAccountInput(req.body);
  if (!parsed.ok) return sendValidation(res, parsed.fields);
  const userId = authOf(res).user.id;
  if (await nameTaken(userId, parsed.value.name)) {
    const e = nameTakenError(parsed.value.name);
    return sendError(res, 409, e.code, e.message);
  }
  const created = await getPrisma().account.create({ data: { userId, ...parsed.value } });
  res.status(201).json({ account: await accountResponse(userId, created.id) });
}));

// F-09 - AC-45..AC-47, AC-49: rename, archive/restore, type change.
accountsRouter.patch("/:id", handle(async (req, res) => {
  const userId = authOf(res).user.id;
  const id = parseId(req.params.id);
  const prisma = getPrisma();
  const account = id === null ? null : await prisma.account.findFirst({ where: { id, userId } });
  if (!account) return sendNotFound(res);

  const parsed = parseAccountPatch(req.body);
  if (!parsed.ok) return sendValidation(res, parsed.fields);
  const patch = parsed.value;
  if (patch.name !== undefined && await nameTaken(userId, patch.name, account.id)) {
    const e = nameTakenError(patch.name);
    return sendError(res, 409, e.code, e.message);
  }
  const data: Prisma.AccountUpdateInput = {};
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.isActive !== undefined) data.isActive = patch.isActive;
  if (patch.type !== undefined && (patch.type !== account.type || patch.subtype !== account.subtype)) {
    // BR-17: the type is locked once the account is used or has an opening balance.
    if (account.openingDate !== null || await isInUse(account.id)) {
      return sendError(res, 422, "ACCOUNT_TYPE_LOCKED", "The type of an account that has transactions or an opening balance cannot change.");
    }
    data.type = patch.type;
    data.subtype = patch.subtype ?? null;
  }
  await prisma.account.update({ where: { id: account.id }, data });
  res.json({ account: await accountResponse(userId, account.id) });
}));

// F-09 - AC-48, BR-17: only an unused account can be deleted.
accountsRouter.delete("/:id", handle(async (req, res) => {
  const userId = authOf(res).user.id;
  const id = parseId(req.params.id);
  const prisma = getPrisma();
  const account = id === null ? null : await prisma.account.findFirst({ where: { id, userId } });
  if (!account) return sendNotFound(res);
  if (await isInUse(account.id)) {
    return sendError(res, 422, "ACCOUNT_IN_USE", "This account has transactions. Archive it instead.");
  }
  await prisma.account.delete({ where: { id: account.id } });
  res.status(204).end();
}));

// F-04 - AC-18..AC-20, BR-06, BR-09. F-09: an own archived account answers ACCOUNT_ARCHIVED (AC-47).
accountsRouter.put("/:id/opening-balance", handle(async (req, res) => {
  const userId = authOf(res).user.id;
  const id = parseId(req.params.id);
  const prisma = getPrisma();
  const account = id === null ? null : await prisma.account.findFirst({ where: { id, userId } });
  if (!account) return sendNotFound(res);

  const { openingBalanceSatang, openingDate } = req.body ?? {};
  const fields: Record<string, string> = {};
  // BR-09 rev. 3.0: only a Cash opening balance may be negative.
  const isCash = account.type === "CASH";
  if (!isValidSatang(openingBalanceSatang, isCash ? -MAX_SATANG : 0)) {
    fields.openingBalanceSatang = `Enter an amount from ${isCash ? "-10,000,000.00" : "0.00"} to 10,000,000.00.`;
  }
  if (!isAllowedDate(openingDate)) fields.openingDate = "Enter a real date from 2000-01-01 up to today.";
  if (Object.keys(fields).length) return sendValidation(res, fields);
  if (!account.isActive) {
    const e = archivedError(account.name);
    return sendError(res, 422, e.code, e.message);
  }
  if (account.type === "INCOME" || account.type === "EXPENSE") {
    return sendError(res, 422, "OPENING_NOT_ALLOWED", "Income and expense accounts have no opening balance.");
  }

  await prisma.account.update({ where: { id: account.id }, data: { openingBalanceSatang, openingDate: toDbDate(openingDate) } });
  res.json({ account: await accountResponse(userId, account.id) });
}));
