import type { AccountType } from "@prisma/client";
import type { TransactionInput } from "./transaction-input.js";
import { headerSign, lineSign } from "./balances.js";
import { formatThb } from "./money.js";

export interface RuleAccount { id: number; type: AccountType }
export interface RuleError { code: string; message: string }

// F-05 steps 2-5 (422). `accounts` holds ONLY the caller's active accounts, so
// an id outside it - missing or another user's - is ACCOUNT_NOT_FOUND (BR-06).
// The allowed types come from the same tables as the balance engine (BR-03,
// BR-04, BR-07), so a type that is allowed always has a defined effect.
export function validateTransactionRules(input: TransactionInput, accounts: Map<number, RuleAccount>): RuleError | null {
  const header = accounts.get(input.accountId);
  if (!header || input.lines.some((l) => !accounts.has(l.accountId))) {
    return { code: "ACCOUNT_NOT_FOUND", message: "One of the chosen accounts was not found." };
  }
  if (!headerSign(input.kind, header.type)) {
    return {
      code: "ACCOUNT_TYPE_NOT_ALLOWED",
      message: input.kind === "PAYMENT" ? "Pay from a cash, bank or credit/loan account." : "Receive money into a cash or bank account.",
    };
  }
  for (const l of input.lines) {
    if (!lineSign(input.kind, accounts.get(l.accountId)!.type)) {
      return {
        code: "ACCOUNT_TYPE_NOT_ALLOWED",
        message: input.kind === "PAYMENT"
          ? "A payment can go to expense, loan or cash accounts only."
          : "Money received can come from income, loan or cash accounts only.",
      };
    }
  }
  const seen = new Set<number>([input.accountId]);
  for (const l of input.lines) {
    if (seen.has(l.accountId)) {
      return { code: "DUPLICATE_LINE_ACCOUNT", message: "Each account can appear once, and not as both the source and a line." };
    }
    seen.add(l.accountId);
  }
  const allocated = input.lines.reduce((s, l) => s + l.amountSatang, 0);
  if (allocated !== input.totalSatang) {
    return { code: "ALLOCATION_MISMATCH", message: `Allocated ${formatThb(allocated)} does not equal the total ${formatThb(input.totalSatang)}.` };
  }
  return null;
}

export interface OwnAccount extends RuleAccount { name: string; isActive: boolean }

// F-09 (AC-47, BR-16): an own archived account cannot be used in a new transaction.
// `keep` lists archived ids that are allowed anyway (F-10: already on the transaction being edited).
// Runs before validateTransactionRules, which only sees the usable accounts.
export function archivedAccountUse(input: TransactionInput, own: OwnAccount[], keep: ReadonlySet<number> = new Set()): RuleError | null {
  const byId = new Map(own.map((a) => [a.id, a]));
  for (const id of [input.accountId, ...input.lines.map((l) => l.accountId)]) {
    const a = byId.get(id);
    if (a && !a.isActive && !keep.has(id)) {
      return { code: "ACCOUNT_ARCHIVED", message: `${a.name} is archived. Restore it or choose another account.` };
    }
  }
  return null;
}

// The accounts a transaction may use: active ones plus the `keep` archived ones.
export function usableAccounts(own: OwnAccount[], keep: ReadonlySet<number> = new Set()): Map<number, RuleAccount> {
  return new Map(own.filter((a) => a.isActive || keep.has(a.id)).map((a) => [a.id, { id: a.id, type: a.type }]));
}
