import { defineConfig, devices } from "@playwright/test";

// E2E runs the real UI (Vite), real API and a separate moneylog_e2e database,
// reset and seeded by e2e/global-setup.ts before every run.
const E2E_DB = process.env.E2E_DATABASE_URL ?? "postgresql://moneylog:moneylog@localhost:5432/moneylog_e2e?schema=public";
export const SEED_PASSWORD = process.env.E2E_SEED_PASSWORD ?? "E2e-Pass-2026";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:5173", trace: "retain-on-failure", viewport: { width: 1280, height: 860 } },
  projects: [{ name: "desktop-chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 860 } } }],
  webServer: [
    {
      command: "npm run dev --prefix server",
      url: "http://localhost:3000/api/health",
      reuseExistingServer: false,
      env: { DATABASE_URL: E2E_DB, PORT: "3000", CLIENT_ORIGIN: "http://localhost:5173" },
    },
    { command: "npm run dev --prefix client", url: "http://localhost:5173", reuseExistingServer: false },
  ],
});
