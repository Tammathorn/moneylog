import type { AccountSubtype, AccountType, PrismaClient, Role } from "@prisma/client";
import { hashPassword } from "../lib/password.js";

// System SDS section 2 - synthetic demo data. Idempotent: upsert by e-mail and
// by (userId, name). Running it twice changes nothing.
type SeedUser = { email: string; displayName: string; role: Role; isActive: boolean };

// The first administrator always exists, so a fresh deployment can be managed.
export const ADMIN_USER: SeedUser = { email: "admin@moneylog.test", displayName: "Pim Admin", role: "ADMIN", isActive: true };

// Demo users exist only when SEED_DEMO_DATA=true (local, CI, the Lab 6 UAT demo).
export const DEMO_USERS: SeedUser[] = [
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

export interface SeedOptions {
  adminPassword: string;
  /** null = production without demo users. */
  demoPassword: string | null;
}

async function upsertUser(prisma: PrismaClient, u: SeedUser, password: string) {
  // An existing user keeps its password: re-running the migration job never resets credentials.
  return prisma.user.upsert({
    where: { email: u.email },
    update: { displayName: u.displayName, role: u.role, isActive: u.isActive },
    create: { ...u, passwordHash: hashPassword(password) },
  });
}

export async function seed(prisma: PrismaClient, options: SeedOptions): Promise<void> {
  await upsertUser(prisma, ADMIN_USER, options.adminPassword);
  if (options.demoPassword === null) return;
  for (const u of DEMO_USERS) {
    const user = await upsertUser(prisma, u, options.demoPassword);
    await createAccountsFor(prisma, user.id);
  }
}

// Reads the seed settings from the environment (R-02). Passwords never come from code.
export function readSeedConfig(env: Record<string, string | undefined>): SeedOptions {
  const adminPassword = env.ADMIN_PASSWORD ?? "";
  if (adminPassword.length < 12) throw new Error("ADMIN_PASSWORD must be set (12+ characters).");
  const demo = (env.SEED_DEMO_DATA ?? "false").toLowerCase() === "true";
  if (!demo) return { adminPassword, demoPassword: null };
  const demoPassword = env.DEMO_USER_PASSWORD ?? "";
  if (demoPassword.length < 12) throw new Error("SEED_DEMO_DATA=true needs DEMO_USER_PASSWORD (12+ characters).");
  return { adminPassword, demoPassword };
}
