import { isCalendarDate } from "./dates.js";
import { MAX_SATANG } from "./money.js";

// F-11 History filter (contract docs/sprints/sprint-2/F-11-history-filter.md §3). Pure: no DB.
export interface HistoryFilter {
  from?: string; to?: string; accountId?: number; kind?: "PAYMENT" | "RECEIPT"; q?: string;
  minSatang?: number; maxSatang?: number; favourite?: boolean; limit: number; offset: number;
}
export const Q_MAX = 100;

const str = (v: unknown) => (typeof v === "string" ? v.trim() : Array.isArray(v) ? String(v[0] ?? "").trim() : "");
const intOf = (s: string) => (/^-?\d+$/.test(s) ? Number(s) : null);

export function parseHistoryFilter(query: Record<string, unknown>): { ok: true; value: HistoryFilter } | { ok: false; fields: Record<string, string> } {
  const fields: Record<string, string> = {};
  const limitN = intOf(str(query.limit));
  const offsetN = intOf(str(query.offset));
  const value: HistoryFilter = {
    limit: limitN && limitN > 0 ? Math.min(limitN, 100) : 50, // clamped as in Sprint 1 (AC-32)
    offset: offsetN && offsetN > 0 ? offsetN : 0,
  };

  for (const key of ["from", "to"] as const) {
    const s = str(query[key]);
    if (!s) continue;
    if (isCalendarDate(s)) value[key] = s;
    else fields[key] = "Use a real date in the form YYYY-MM-DD.";
  }
  if (value.from && value.to && value.from > value.to) fields.from = "From must not be after To.";

  const account = str(query.accountId);
  if (account) {
    const n = intOf(account);
    if (n !== null && n > 0) value.accountId = n;
    else fields.accountId = "Choose an account.";
  }

  const kind = str(query.kind);
  if (kind) {
    if (kind === "PAYMENT" || kind === "RECEIPT") value.kind = kind;
    else fields.kind = "Kind must be PAYMENT or RECEIPT.";
  }

  const q = str(query.q);
  if (q) {
    if (q.length <= Q_MAX) value.q = q;
    else fields.q = `Search text can be at most ${Q_MAX} characters.`;
  }

  for (const key of ["minSatang", "maxSatang"] as const) {
    const s = str(query[key]);
    if (!s) continue;
    const n = intOf(s);
    if (n !== null && n >= 0 && n <= MAX_SATANG) value[key] = n;
    else fields[key] = "Enter an amount from 0.00 to 10,000,000.00.";
  }
  if (value.minSatang !== undefined && value.maxSatang !== undefined && value.minSatang > value.maxSatang) {
    fields.minSatang = "Min must not be above Max.";
  }

  const fav = str(query.favourite);
  if (fav === "true") value.favourite = true;
  else if (fav && fav !== "false") fields.favourite = "favourite must be true or false.";

  return Object.keys(fields).length ? { ok: false, fields } : { ok: true, value };
}
