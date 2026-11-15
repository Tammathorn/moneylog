import { expect, test } from "@playwright/test";
import { shot, signIn, today } from "./support";

// TEST-50 - the stakeholder's Sprint 1 journey through UI, API and DB (AC-08, AC-21..24, AC-35).
test("TEST-50 alice logs a month of money and sees correct balances, summary and history", async ({ page }) => {
  await page.goto("/login");
  await shot(page, "01-sign-in");
  await signIn(page, "alice@moneylog.test");
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.getByTestId("current-user")).toHaveText("Alice Chaiyo");

  // Opening bank balance 10,000.00
  await page.getByRole("navigation").getByRole("link", { name: "Accounts" }).click();
  await page.getByRole("button", { name: "Set opening balance for KBank Savings" }).click();
  await page.getByLabel("Opening amount").fill("10000");
  await page.getByLabel("Opening date").fill(today());
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByTestId("balance-KBank Savings")).toHaveText("฿10,000.00");

  // Salary 25,000.00 received into the bank
  await page.getByRole("navigation").getByRole("link", { name: "New transaction" }).click();
  await page.getByRole("button", { name: "Money received" }).click();
  await page.getByLabel("Received into *").selectOption({ label: "KBank Savings" });
  await page.getByLabel("Total (THB) *").fill("25000");
  await page.getByLabel("Description").fill("November salary");
  await page.getByLabel("Line 1 account").selectOption({ label: "Salary" });
  await page.getByLabel("Line 1 amount").fill("25000");
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(page.getByRole("heading", { name: "Transaction saved" })).toBeVisible();

  // Card purchase 1,850.00 split Dining 650 + Groceries 1,200
  await page.getByRole("button", { name: "Record another" }).click();
  await page.getByRole("button", { name: "Payment / charge" }).click();
  await page.getByLabel("Paid from *").selectOption({ label: "KTC Credit Card" });
  await page.getByLabel("Total (THB) *").fill("1850");
  await page.getByLabel("Description").fill("Central World");
  await page.getByLabel("Line 1 account").selectOption({ label: "Dining" });
  await page.getByLabel("Line 1 amount").fill("650");
  await page.getByRole("button", { name: "Add line" }).click();
  await page.getByLabel("Line 2 account").selectOption({ label: "Groceries" });
  await page.getByLabel("Line 2 amount").fill("1200");
  await expect(page.getByTestId("remaining")).toHaveText("฿0.00");
  await shot(page, "03-card-purchase-split");
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(page.getByRole("heading", { name: "Transaction saved" })).toBeVisible();

  // Card repayment 1,000.00 from the bank
  await page.getByRole("button", { name: "Record another" }).click();
  await page.getByLabel("Paid from *").selectOption({ label: "KBank Savings" });
  await page.getByLabel("Total (THB) *").fill("1000");
  await page.getByLabel("Description").fill("Pay KTC card");
  await page.getByLabel("Line 1 account").selectOption({ label: "KTC Credit Card" });
  await page.getByLabel("Line 1 amount").fill("1000");
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(page.getByRole("heading", { name: "Transaction saved" })).toBeVisible();

  // Overview: AC-35 figures (retrieved from the DB through the API)
  await page.getByRole("navigation").getByRole("link", { name: "Overview" }).click();
  await expect(page.getByTestId("total-cash")).toHaveText("฿34,000.00");
  await expect(page.getByTestId("total-debt")).toHaveText("฿850.00");
  await expect(page.getByTestId("income")).toHaveText("฿25,000.00");
  await expect(page.getByTestId("expenses")).toHaveText("฿1,850.00");
  await expect(page.getByTestId("net")).toHaveText("฿23,150.00");
  const categories = page.getByRole("table", { name: "Spending by category" }).getByRole("row");
  await expect(categories.nth(0)).toContainText("Groceries");
  await expect(categories.nth(1)).toContainText("Dining");
  await shot(page, "04-overview-after-journey");

  // Retrieve after a full page reload: the data is persisted, not held in the browser.
  await page.reload();
  await expect(page.getByTestId("total-cash")).toHaveText("฿34,000.00");
  await page.getByRole("navigation").getByRole("link", { name: "Accounts" }).click();
  await expect(page.getByTestId("balance-KTC Credit Card")).toHaveText("฿850.00");
  await shot(page, "05-accounts-after-journey");

  await page.getByRole("navigation").getByRole("link", { name: "History" }).click();
  const rows = page.getByRole("table", { name: "Transactions" }).getByRole("row");
  await expect(rows).toHaveCount(4); // header + 3
  await shot(page, "06-history");
  await page.getByRole("link", { name: today() }).nth(1).click();
  await expect(page.getByRole("table", { name: "Lines" })).toContainText("Groceries");
  await shot(page, "07-transaction-detail");

  // Sign out ends the session on the server.
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in to MoneyLog" })).toBeVisible();
  const me = await page.request.get("/api/auth/me");
  expect(me.status()).toBe(401);
});
