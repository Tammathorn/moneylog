import type { TransactionKind } from "@prisma/client";
import { isValidSatang } from "./money.js";
import { isAllowedDate } from "./dates.js";

// F-05 step 1 (shape validation, 400). Pure: no DB. AC-28, BR-02, BR-10, BR-11.
export interface LineInput { accountId: number; amountSatang: number; note: string | null }
export interface TransactionInput {
  kind: TransactionKind; accountId: number; date: string; totalSatang: number; description: string | null; lines: LineInput[];
}
export type ParseResult = { ok: true; value: TransactionInput } | { ok: false; fields: Record<string, string> };

export const MAX_LINES = 20;
const isId = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v > 0 && v <= 2_147_483_647;

function optionalText(v: unknown, max: number): { ok: boolean; value: string | null } {
  if (v === undefined || v === null) return { ok: true, value: null };
  if (typeof v !== "string") return { ok: false, value: null };
  const t = v.trim();
  return { ok: t.length <= max, value: t === "" ? null : t };
}

export function parseTransactionInput(body: unknown, now = new Date()): ParseResult {
  const b = (body ?? {}) as Record<string, unknown>;
  const fields: Record<string, string> = {};
  if (b.kind !== "PAYMENT" && b.kind !== "RECEIPT") fields.kind = "Choose Payment or Money received.";
  if (!isId(b.accountId)) fields.accountId = "Choose an account.";
  if (!isAllowedDate(b.date, now)) fields.date = "Enter a real date from 2000-01-01 up to today.";
  if (!isValidSatang(b.totalSatang)) fields.totalSatang = "Enter a total from 0.01 to 10,000,000.00.";
  const description = optionalText(b.description, 200);
  if (!description.ok) fields.description = "Description must be 200 characters or fewer.";

  const lines: LineInput[] = [];
  if (!Array.isArray(b.lines) || b.lines.length < 1 || b.lines.length > MAX_LINES) {
    fields.lines = `Add between 1 and ${MAX_LINES} lines.`;
  } else {
    b.lines.forEach((raw, i) => {
      const l = (raw ?? {}) as Record<string, unknown>;
      if (!isId(l.accountId)) fields[`lines[${i}].accountId`] = "Choose an account.";
      if (!isValidSatang(l.amountSatang)) fields[`lines[${i}].amountSatang`] = "Enter an amount from 0.01 to 10,000,000.00.";
      const note = optionalText(l.note, 100);
      if (!note.ok) fields[`lines[${i}].note`] = "Note must be 100 characters or fewer.";
      lines.push({ accountId: l.accountId as number, amountSatang: l.amountSatang as number, note: note.value });
    });
  }
  if (Object.keys(fields).length) return { ok: false, fields };
  return {
    ok: true,
    value: { kind: b.kind as TransactionKind, accountId: b.accountId as number, date: b.date as string,
      totalSatang: b.totalSatang as number, description: description.value, lines },
  };
}
