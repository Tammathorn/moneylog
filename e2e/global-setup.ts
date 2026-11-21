import { execSync } from "node:child_process";

// Fresh, known data for every run: reset the e2e database, apply migrations, seed.
export default function globalSetup(): void {
  const url = process.env.E2E_DATABASE_URL ?? "postgresql://moneylog:moneylog@localhost:5432/moneylog_e2e?schema=public";
  const password = process.env.E2E_SEED_PASSWORD ?? "E2e-Pass-2026";
  const env = { ...process.env, DATABASE_URL: url, ADMIN_PASSWORD: password, SEED_DEMO_DATA: "true", DEMO_USER_PASSWORD: password };
  execSync("npx prisma migrate reset --force --skip-seed", { cwd: "server", env, stdio: "ignore" });
  execSync("npm run db:seed", { cwd: "server", env, stdio: "ignore" });
}
