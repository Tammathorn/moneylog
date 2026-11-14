import type { Prisma, PrismaClient } from "@prisma/client";
import type { TransactionInput } from "../domain/transaction-input.js";
import { fromDbDate, toDbDate } from "../domain/dates.js";

// BR-12, NFR-05 - header and lines in one DB transaction: all rows or none.
export async function insertTransaction(prisma: PrismaClient, userId: number, input: TransactionInput) {
  return prisma.$transaction(async (db) => {
    const tx = await db.moneyTransaction.create({
      data: { userId, kind: input.kind, accountId: input.accountId, date: toDbDate(input.date), totalSatang: input.totalSatang, description: input.description },
    });
    for (const l of input.lines) {
      await db.transactionLine.create({ data: { transactionId: tx.id, accountId: l.accountId, amountSatang: l.amountSatang, note: l.note } });
    }
    return tx.id;
  });
}

const accountRef = { select: { id: true, name: true, type: true } } as const;
export const transactionInclude = { account: accountRef, lines: { include: { account: accountRef }, orderBy: { id: "asc" } } } satisfies Prisma.MoneyTransactionInclude;
type Row = Prisma.MoneyTransactionGetPayload<{ include: typeof transactionInclude }>;

export function transactionDto(t: Row) {
  return {
    id: t.id, kind: t.kind, date: fromDbDate(t.date), totalSatang: t.totalSatang, description: t.description,
    createdAt: t.createdAt.toISOString(), account: t.account,
    lines: t.lines.map((l) => ({ id: l.id, amountSatang: l.amountSatang, note: l.note, account: l.account })),
  };
}
