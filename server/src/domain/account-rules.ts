import type { AccountSubtype, AccountType } from "@prisma/client";

// F-09 rules (contract docs/sprints/sprint-2/F-09-account-management.md §3 steps 2-5). Pure: no DB.
export interface AccountInput { name: string; type: AccountType; subtype: AccountSubtype | null }
export type AccountPatch = Partial<AccountInput> & { isActive?: boolean };
export type Parsed<T> = { ok: true; value: T } | { ok: false; fields: Record<string, string> };

export const NAME_MAX = 60;
const TYPES: AccountType[] = ["CASH", "LOAN_GIVEN", "LOAN_TAKEN", "INCOME", "EXPENSE"];

// Step 4: which subtypes each type allows, whether one is required, and the default.
const SUBTYPES: Record<AccountType, { allowed: AccountSubtype[]; required: boolean; fallback: AccountSubtype | null }> = {
  CASH: { allowed: ["WALLET", "BANK"], required: true, fallback: null },
  LOAN_TAKEN: { allowed: ["CREDIT_CARD", "PERSONAL", "OTHER"], required: true, fallback: null },
  LOAN_GIVEN: { allowed: ["PERSONAL", "OTHER"], required: false, fallback: "PERSONAL" },
  INCOME: { allowed: [], required: false, fallback: null },
  EXPENSE: { allowed: [], required: false, fallback: null },
};

const SUBTYPE_MESSAGE: Record<AccountType, string> = {
  CASH: "Choose Wallet or Bank.",
  LOAN_TAKEN: "Choose Credit card, Personal or Other.",
  LOAN_GIVEN: "Choose Personal or Other.",
  INCOME: "Income accounts have no subtype.",
  EXPENSE: "Expense accounts have no subtype.",
};

function parseName(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length >= 1 && t.length <= NAME_MAX ? t : null;
}

export function subtypeRule(type: AccountType, subtype: unknown): { ok: true; value: AccountSubtype | null } | { ok: false } {
  const rule = SUBTYPES[type];
  if (subtype === undefined || subtype === null || subtype === "") {
    return rule.required ? { ok: false } : { ok: true, value: rule.fallback };
  }
  return rule.allowed.includes(subtype as AccountSubtype) ? { ok: true, value: subtype as AccountSubtype } : { ok: false };
}

const isType = (v: unknown): v is AccountType => TYPES.includes(v as AccountType);

export function parseAccountInput(body: unknown): Parsed<AccountInput> {
  const b = (body ?? {}) as Record<string, unknown>;
  const fields: Record<string, string> = {};
  const name = parseName(b.name);
  if (name === null) fields.name = `Enter a name of 1 to ${NAME_MAX} characters.`;
  let subtype: AccountSubtype | null = null;
  if (!isType(b.type)) fields.type = "Choose an account type.";
  else {
    const s = subtypeRule(b.type, b.subtype);
    if (s.ok) subtype = s.value;
    else fields.subtype = SUBTYPE_MESSAGE[b.type];
  }
  if (Object.keys(fields).length) return { ok: false, fields };
  return { ok: true, value: { name: name!, type: b.type as AccountType, subtype } };
}

export function parseAccountPatch(body: unknown): Parsed<AccountPatch> {
  const b = (body ?? {}) as Record<string, unknown>;
  const fields: Record<string, string> = {};
  const value: AccountPatch = {};
  if (b.name === undefined && b.isActive === undefined && b.type === undefined) {
    return { ok: false, fields: { name: "Send a new name, an archive flag or a new type." } };
  }
  if (b.name !== undefined) {
    const name = parseName(b.name);
    if (name === null) fields.name = `Enter a name of 1 to ${NAME_MAX} characters.`;
    else value.name = name;
  }
  if (b.isActive !== undefined) {
    if (typeof b.isActive !== "boolean") fields.isActive = "isActive must be true or false.";
    else value.isActive = b.isActive;
  }
  if (b.type !== undefined) {
    if (!isType(b.type)) fields.type = "Choose an account type.";
    else {
      const s = subtypeRule(b.type, b.subtype);
      if (s.ok) { value.type = b.type; value.subtype = s.value; }
      else fields.subtype = SUBTYPE_MESSAGE[b.type];
    }
  }
  if (Object.keys(fields).length) return { ok: false, fields };
  return { ok: true, value };
}

// Step 6: names are unique per user, trimmed and case-insensitive (AC-45).
export const sameName = (a: string, b: string) => a.trim().toLocaleLowerCase("en") === b.trim().toLocaleLowerCase("en");
