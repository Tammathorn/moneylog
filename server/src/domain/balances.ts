import type { AccountType, TransactionKind } from "@prisma/client";

// BR-07, BR-13 - the single place that says how a transaction moves balances.
// Balances are derived (D-02): opening + sum of effects, never stored.
export interface BalanceAccount { id: number; type: AccountType; openingBalanceSatang: number }
export interface BalanceLine { accountId: number; amountSatang: number }
export interface BalanceTransaction { kind: TransactionKind; accountId: number; totalSatang: number; lines: BalanceLine[] }

// Sign applied to the header account for the transaction total.
const HEADER_SIGN: Record<TransactionKind, Partial<Record<AccountType, 1 | -1>>> = {
  PAYMENT: { CASH: -1, LOAN_TAKEN: +1 },
  RECEIPT: { CASH: +1 },
};
// Sign applied to a line's account for the line amount.
const LINE_SIGN: Record<TransactionKind, Partial<Record<AccountType, 1 | -1>>> = {
  PAYMENT: { EXPENSE: +1, LOAN_TAKEN: -1, LOAN_GIVEN: +1, CASH: +1 },
  RECEIPT: { INCOME: +1, LOAN_GIVEN: -1, LOAN_TAKEN: +1, CASH: -1 },
};

export function headerSign(kind: TransactionKind, type: AccountType): 1 | -1 | undefined {
  return HEADER_SIGN[kind][type];
}
export function lineSign(kind: TransactionKind, type: AccountType): 1 | -1 | undefined {
  return LINE_SIGN[kind][type];
}

export function computeBalances(accounts: BalanceAccount[], transactions: BalanceTransaction[]): Map<number, number> {
  const typeOf = new Map(accounts.map((a) => [a.id, a.type]));
  const balances = new Map(accounts.map((a) => [a.id, a.openingBalanceSatang]));
  const add = (id: number, delta: number) => balances.set(id, (balances.get(id) ?? 0) + delta);

  for (const tx of transactions) {
    const hType = typeOf.get(tx.accountId);
    const hSign = hType && headerSign(tx.kind, hType);
    if (!hSign) throw new Error(`Invalid header account ${tx.accountId} for ${tx.kind}`);
    add(tx.accountId, hSign * tx.totalSatang);
    for (const line of tx.lines) {
      const lType = typeOf.get(line.accountId);
      const lSign = lType && lineSign(tx.kind, lType);
      if (!lSign) throw new Error(`Invalid line account ${line.accountId} for ${tx.kind}`);
      add(line.accountId, lSign * line.amountSatang);
    }
  }
  return balances;
}
