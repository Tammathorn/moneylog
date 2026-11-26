// F-11 (contract §3). Stub committed with the tests (TDD red); implemented next.
export interface HistoryFilter {
  from?: string; to?: string; accountId?: number; kind?: "PAYMENT" | "RECEIPT"; q?: string;
  minSatang?: number; maxSatang?: number; favourite?: boolean; limit: number; offset: number;
}
export function parseHistoryFilter(_query: Record<string, unknown>): { ok: true; value: HistoryFilter } | { ok: false; fields: Record<string, string> } {
  return { ok: true, value: { limit: 50, offset: 0 } };
}
