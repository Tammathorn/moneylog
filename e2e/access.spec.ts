import { expect, test } from "@playwright/test";
import { shot, signIn } from "./support";

// TEST-52 and TEST-09 (admin side) - AC-08, AC-10, BR-20.
test("TEST-52 the administrator manages users but cannot reach financial data", async ({ page }) => {
  await signIn(page, "admin@moneylog.test");
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  await expect(page.getByTestId("status-dave@moneylog.test")).toHaveText("Disabled");
  await shot(page, "09-admin-users");

  await page.goto("/accounts");
  await expect(page.getByText("This page is not available for your role.")).toBeVisible();
  await shot(page, "10-admin-forbidden-page");
  for (const path of ["/api/summary", "/api/accounts", "/api/transactions"]) {
    const res = await page.request.get(path);
    expect(res.status(), path).toBe(403);
    expect(await res.json()).toEqual({ error: { code: "FORBIDDEN_ROLE", message: "You do not have access to this." } });
  }
});

test("TEST-09 a disabled user cannot sign in (AC-02 via UI)", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("dave@moneylog.test");
  await page.getByLabel("Password").fill(process.env.E2E_SEED_PASSWORD ?? "E2e-Pass-2026");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toHaveText("E-mail or password is incorrect.");
  await shot(page, "02-sign-in-rejected");
});
