import { expect, test } from "@playwright/test";
import { PASSWORD, SHOTS2, shot, signIn } from "./support";

// TEST-99 - F-09 through the real UI, API and DB: create, archive (refused in a new transaction), restore (AC-43, AC-47, AC-50).
test("TEST-99 bob creates an account, archives Wallet and the API refuses it in a new transaction", async ({ page }) => {
  await signIn(page, "bob@moneylog.test");
  await page.getByRole("navigation").getByRole("link", { name: "Accounts" }).click();
  await page.getByRole("button", { name: "New account" }).click();
  await page.getByLabel("Account name").fill("SCB Savings");
  await page.getByLabel("Account type").selectOption("CASH");
  await page.getByLabel("Subtype").selectOption("BANK");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByTestId("balance-SCB Savings")).toHaveText("฿0.00");

  await page.getByRole("button", { name: "Archive Wallet" }).click();
  const archived = page.getByRole("region", { name: "Archived accounts" });
  await expect(archived.getByRole("button", { name: "Restore Wallet" })).toBeVisible();
  await shot(page, "14-accounts-archived", SHOTS2);

  // UI: Wallet is no longer offered. API: forcing it is refused and nothing is saved.
  await page.getByRole("navigation").getByRole("link", { name: "New transaction" }).click();
  await expect(page.getByLabel("Paid from *")).not.toContainText("Wallet");
  const accounts = (await (await page.request.get("/api/accounts")).json()).accounts as { id: number; name: string }[];
  const id = (n: string) => accounts.find((a) => a.name === n)!.id;
  const before = (await (await page.request.get("/api/transactions")).json()).total;
  const res = await page.request.post("/api/transactions", {
    headers: { Origin: "http://localhost:5173" },
    data: { kind: "PAYMENT", accountId: id("Wallet"), date: "2026-11-20", totalSatang: 5000, lines: [{ accountId: id("Dining"), amountSatang: 5000 }] },
  });
  expect(res.status()).toBe(422);
  expect((await res.json()).error.code).toBe("ACCOUNT_ARCHIVED");
  expect((await (await page.request.get("/api/transactions")).json()).total).toBe(before);

  await page.getByRole("navigation").getByRole("link", { name: "Accounts" }).click();
  await page.getByRole("button", { name: "Restore Wallet" }).click();
  await expect(page.getByRole("button", { name: "Archive Wallet" })).toBeVisible();
});

// TEST-100 - F-16 FR-22 through the real UI: change password, old one stops working (AC-76, AC-80).
test("TEST-100 bob changes his password; the new one works and the old one does not", async ({ page }) => {
  const NEW = "Bob-New-Pass-2026";
  await signIn(page, "bob@moneylog.test");
  await page.getByRole("link", { name: "Change password" }).click();
  await page.getByLabel("Current password").fill(PASSWORD);
  await page.getByLabel("New password", { exact: true }).fill(NEW);
  await page.getByLabel("Repeat new password").fill(NEW);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Your password was changed. Other devices were signed out.")).toBeVisible();
  await shot(page, "15-change-password", SHOTS2);
  await page.getByRole("button", { name: "Sign out" }).click();

  const old = await page.request.post("/api/auth/login", { headers: { Origin: "http://localhost:5173" }, data: { email: "bob@moneylog.test", password: PASSWORD } });
  expect(old.status()).toBe(401);
  await page.getByLabel("E-mail").fill("bob@moneylog.test");
  await page.getByLabel("Password").fill(NEW);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("current-user")).toHaveText("Bob Somsak");
});
