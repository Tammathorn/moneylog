import type { AccountType } from "@prisma/client";
import type { TransactionInput } from "./transaction-input.js";

export interface RuleAccount { id: number; type: AccountType }
export interface RuleError { code: string; message: string }

// Skeleton only - the rules are implemented in the next commit (TDD red step).
export function validateTransactionRules(_input: TransactionInput, _accounts: Map<number, RuleAccount>): RuleError | null {
  return null;
}
