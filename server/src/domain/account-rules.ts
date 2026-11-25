import type { AccountSubtype, AccountType } from "@prisma/client";

// F-09 rules (contract §3 steps 2-5). Stub committed with the tests (TDD red); implemented next.
export interface AccountInput { name: string; type: AccountType; subtype: AccountSubtype | null }
export type AccountPatch = Partial<AccountInput> & { isActive?: boolean };
export type Parsed<T> = { ok: true; value: T } | { ok: false; fields: Record<string, string> };

export function parseAccountInput(_body: unknown): Parsed<AccountInput> {
  return { ok: false, fields: {} };
}
export function parseAccountPatch(_body: unknown): Parsed<AccountPatch> {
  return { ok: false, fields: {} };
}
export function sameName(_a: string, _b: string): boolean {
  return false;
}
