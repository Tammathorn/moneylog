import type { AccountSubtype, AccountType, PrismaClient, Role } from "@prisma/client";
import { hashPassword } from "../lib/password.js";

// System SDS section 2 - synthetic demo data. Idempotent: upsert by e-mail and
// by (userId, name). Running it twice changes nothing.
export const DEMO_USERS: { email: string; displayName: string; role: Role; isActive: boolean }[] = [
  { email: "admin@moneylog.test", displayName: "Pim Admin", role: "ADMIN", isActive: true },
  { email: "alice@moneylog.test", displayName: "Alice Chaiyo", role: "USER", isActive: true },
  { email: "bob@moneylog.test", displayName: "Bob Somsak", role: "USER", isActive: true },
  { email: "dave@moneylog.test", displayName: "Dave Disabled", role: "USER", isActive: false },
];

export const DEMO_ACCOUNTS: { name: string; type: AccountType; subtype: AccountSubtype | null }[] = [
  { name: "KBank Savings", type: "CASH", subtype: "BANK" },
  { name: "Wallet", type: "CASH", subtype: "WALLET" },
  { name: "KTC Credit Card", type: "LOAN_TAKEN", subtype: "CREDIT_CARD" },
  { name: "Loan to Beam", type: "LOAN_GIVEN", subtype: "PERSONAL" },
  { name: "Salary", type: "INCOME", subtype: null },
  { name: "Interest", type: "INCOME", subtype: null },
  { name: "Dining", type: "EXPENSE", subtype: null },
  { name: "Groceries", type: "EXPENSE", subtype: null },
  { name: "Electricity", type: "EXPENSE", subtype: null },
  { name: "Telecom", type: "EXPENSE", subtype: null },
];

export async function createAccountsFor(prisma: PrismaClient, userId: number): Promise<void> {
  for (const a of DEMO_ACCOUNTS) {
    await prisma.account.upsert({
      where: { userId_name: { userId, name: a.name } },
      update: {},
      create: { userId, ...a },
    });
  }
}

export async function seed(prisma: PrismaClient, password: string): Promise<void> {
  const passwordHash = hashPassword(password);
  for (const u of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { displayName: u.displayName, role: u.role, isActive: u.isActive },
      create: { ...u, passwordHash },
    });
    if (u.role === "USER") await createAccountsFor(prisma, user.id);
  }
}
