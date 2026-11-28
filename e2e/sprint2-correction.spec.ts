import { expect, test, type Page } from "@playwright/test";
import { SHOTS2, shot, signIn } from "./support";

// TEST-80 - edit, duplicate and delete through the real UI, API and DB (AC-51, AC-54, AC-57, AC-65).
async function balances(page: Page): Promise<Record<string, number>> {
  const r = await (await page.request.get("/api/accounts")).json();
  return Object.fromEntries(r.accounts.map((a: { name: string; balanceSatang: number }) => [a.name, a.balanceSatang]));
}
const historyTotal = async (page: Page) => (await (await page.request.get("/api/transactions")).json()).total as number;

test("TEST-80 alice corrects a card purchase, duplicates it and deletes the duplicate", async ({ page }) => {
  await signIn(page, "alice@moneylog.test");
  const before = await balances(page);
  const count = await historyTotal(page);

  await page.getByRole("navigation").getByRole("link", { name: "New transaction" }).click();
  await page.getByLabel("Paid from *").selectOption({ label: "KTC Credit Card" });
  await page.getByLabel("Total (THB) *").fill("1850");
  await page.getByLabel("Description").fill("E2E Central World");
  await page.getByLabel("Line 1 account").selectOption({ label: "Dining" });
  await page.getByLabel("Line 1 amount").fill("650");
  await page.getByRole("button", { name: "Add line" }).click();
  await page.getByLabel("Line 2 account").selectOption({ label: "Groceries" });
  await page.getByLabel("Line 2 amount").fill("1200");
  await page.getByRole("button", { name: "Save transaction" }).click();
  await page.getByRole("link", { name: "View transaction" }).click();

  // Edit: Groceries 1,200.00 -> 1,000.00, total 1,650.00.
  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page.getByRole("heading", { name: "Edit transaction" })).toBeVisible();
  await page.getByLabel("Total (THB) *").fill("1650");
  await page.getByLabel("Line 2 amount").fill("1000");
  await shot(page, "10-edit-transaction", SHOTS2);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { name: /Payment · ฿1,650\.00/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Duplicate" })).toBeVisible();
  await expect(page.getByText(/^Edited /)).toBeVisible();
  const afterEdit = await balances(page);
  expect(afterEdit["KTC Credit Card"] - before["KTC Credit Card"]).toBe(165000);
  expect(afterEdit.Groceries - before.Groceries).toBe(100000);
  expect(afterEdit.Dining - before.Dining).toBe(65000);

  // Favourite, then Duplicate: pre-filled with today's date, nothing saved until Save.
  await page.getByRole("button", { name: "Mark as favourite" }).click();
  await expect(page.getByRole("button", { name: "Remove from favourites" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("link", { name: "Duplicate" }).click();
  await expect(page.getByLabel("Description")).toHaveValue("E2E Central World");
  await expect(page.getByRole("button", { name: "Save transaction" })).toBeEnabled();
  expect(await historyTotal(page)).toBe(count + 1);
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(page.getByRole("heading", { name: "Transaction saved" })).toBeVisible();
  expect(await historyTotal(page)).toBe(count + 2);
  await page.getByRole("link", { name: "View transaction" }).click();

  // Delete the duplicate: confirmation first, then balances go back.
  await page.getByRole("button", { name: "Delete" }).click();
  await shot(page, "11-delete-confirm", SHOTS2);
  await page.getByRole("button", { name: "Confirm delete" }).click();
  await expect(page.getByRole("heading", { name: "History" })).toBeVisible();
  expect(await historyTotal(page)).toBe(count + 1);
  expect(await balances(page)).toEqual(afterEdit);

  await page.getByLabel("Favourites only").check();
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("table", { name: "Transactions" }).getByText("E2E Central World")).toHaveCount(1);
  await shot(page, "12-history-favourites", SHOTS2);

  // The Loans page uses the same balances (F-13): the card's outstanding equals its account balance.
  await page.getByRole("navigation").getByRole("link", { name: "Loans" }).click();
  const card = (await balances(page))["KTC Credit Card"];
  const owe = page.getByRole("region", { name: "Money I owe" });
  await expect(owe.getByText("KTC Credit Card")).toBeVisible();
  await expect(owe.locator("details", { hasText: "KTC Credit Card" }).locator(".loan-outstanding")).toContainText(
    new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(card / 100));
  await shot(page, "13-loans", SHOTS2);
});
