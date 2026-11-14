import { randomUUID } from "node:crypto";
import request from "supertest";
import type { Role } from "@prisma/client";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/lib/password.js";
import { createAccountsFor } from "../../src/seed/seed-data.js";

export const PASSWORD = "Test-Pass-2026";
const HASH = hashPassword(PASSWORD);

// A fresh user per test file keeps tests independent of each other and of the seed.
export async function makeUser(role: Role = "USER", isActive = true) {
  const prisma = getPrisma();
  const email = `t-${randomUUID().slice(0, 8)}@moneylog.test`;
  const user = await prisma.user.create({
    data: { email, displayName: `Test ${role}`, role, passwordHash: HASH, isActive },
  });
  if (role === "USER") await createAccountsFor(prisma, user.id);
  const accounts = await prisma.account.findMany({ where: { userId: user.id } });
  const acc = Object.fromEntries(accounts.map((a) => [a.name, a.id])) as Record<string, number>;
  return { user, email, acc };
}

export async function signIn(email: string) {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/login").send({ email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`sign-in failed: ${res.status}`);
  return agent;
}

export async function makeSignedInUser(role: Role = "USER") {
  const made = await makeUser(role);
  return { ...made, agent: await signIn(made.email) };
}

export async function counts() {
  const prisma = getPrisma();
  return { tx: await prisma.moneyTransaction.count(), lines: await prisma.transactionLine.count() };
}
