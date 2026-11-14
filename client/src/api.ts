// Thin fetch wrapper. The server is the authority; this only shapes errors.
export type Role = "USER" | "ADMIN";
export interface User { id: number; email: string; displayName: string; role: Role }
export type AccountType = "CASH" | "LOAN_GIVEN" | "LOAN_TAKEN" | "INCOME" | "EXPENSE";
export interface Account {
  id: number; name: string; type: AccountType; subtype: string | null;
  openingBalanceSatang: number; openingDate: string | null; balanceSatang: number; isActive: boolean;
}
export interface AccountRef { id: number; name: string; type: AccountType }
export interface Transaction {
  id: number; kind: "PAYMENT" | "RECEIPT"; date: string; totalSatang: number; description: string | null; createdAt: string;
  account: AccountRef; lines: { id: number; amountSatang: number; note: string | null; account: AccountRef }[];
}
export interface Summary {
  cash: { totalSatang: number; accounts: { id: number; name: string; subtype: string | null; balanceSatang: number }[] };
  debt: { totalSatang: number; accounts: { id: number; name: string; balanceSatang: number }[] };
  loansGiven: { totalSatang: number; accounts: { id: number; name: string; balanceSatang: number }[] };
  incomeSatang: number; expenseSatang: number; netSatang: number;
  categorySpending: { id: number; name: string; amountSatang: number }[];
  range: { from: string | null; to: string | null };
}
export interface AdminUser extends User { isActive: boolean; createdAt: string }

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fields: Record<string, string> = {}) {
    super(message);
  }
}

export const GENERIC = "Something went wrong. Please try again.";
export const SESSION_ENDED = "Your session has ended. Please sign in again.";

let onUnauthorized: () => void = () => {};
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn; };

export async function api<T>(path: string, init: { method?: string; body?: unknown; quiet401?: boolean } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: init.method ?? "GET",
      credentials: "same-origin",
      headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError(0, "NETWORK", GENERIC);
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const e = data?.error;
    if (res.status === 401 && !init.quiet401) onUnauthorized();
    const message = res.status >= 500 || !e?.message ? GENERIC : e.message;
    throw new ApiError(res.status, e?.code ?? "UNKNOWN", message, e?.fields ?? {});
  }
  return data as T;
}
