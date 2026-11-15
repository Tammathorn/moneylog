import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { seed } from "../src/seed/seed-data.js";

const SERVER_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const TEST_DB = "moneylog_test";
export const TEST_PASSWORD = "Test-Pass-2026";

function loadDotEnv(): void {
  const file = resolve(SERVER_DIR, ".env");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

function withDb(url: string, db: string): string {
  const u = new URL(url);
  u.pathname = `/${db}`;
  return u.toString();
}

export default async function setup(): Promise<void> {
  loadDotEnv();
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error("DATABASE_URL is not set - copy server/.env.example to server/.env");
  const testUrl = withDb(base, TEST_DB);

  const admin = new PrismaClient({ datasources: { db: { url: withDb(base, "postgres") } } });
  try {
    await admin.$executeRawUnsafe(`CREATE DATABASE "${TEST_DB}"`);
  } catch (e) {
    if (!/already exists|42P04/.test(String(e))) throw e;
  } finally {
    await admin.$disconnect();
  }
  execSync("npx prisma migrate deploy", { cwd: SERVER_DIR, env: { ...process.env, DATABASE_URL: testUrl }, stdio: "ignore" });

  const prisma = new PrismaClient({ datasources: { db: { url: testUrl } } });
  try {
    await seed(prisma, TEST_PASSWORD);
  } finally {
    await prisma.$disconnect();
  }
  process.env.DATABASE_URL = testUrl;
  process.env.CLIENT_ORIGIN = "http://localhost:5173";
}
