import { expect, type Page } from "@playwright/test";

export const PASSWORD = process.env.E2E_SEED_PASSWORD ?? "E2e-Pass-2026";
export const SHOTS = "docs/sprints/sprint-1/evidence/screenshots";
export const SHOTS2 = "docs/sprints/sprint-2/evidence/screenshots";
export const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());

export async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("current-user")).toBeVisible();
}

export async function shot(page: Page, name: string, dir = SHOTS) {
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true });
}
