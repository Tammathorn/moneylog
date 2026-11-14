import { expect, test } from "@playwright/test";
import { shot, signIn, today } from "./support";

// TEST-51 - allocation mismatch is blocked in the UI and refused by the API (AC-25, AC-31).
test("TEST-51 a 1,850.00 total with lines of 650.00 + 1,199.99 cannot be saved", async ({ page }) => {
  await signIn(page, "bob@moneylog.test");
  await page.getByRole("navigation").getByRole("link", { name: "New transaction" }).click();
  await page.getByLabel("Paid from *").selectOption({ label: "KTC Credit Card" });
  await page.getByLabel("Total (THB) *").fill("1850");
  await page.getByLabel("Line 1 account").selectOption({ label: "Dining" });
  await page.getByLabel("Line 1 amount").fill("650");
  await page.getByRole("button", { name: "Add line" }).click();
  await page.getByLabel("Line 2 account").selectOption({ label: "Groceries" });
  await page.getByLabel("Line 2 amount").fill("1199.99");
  await expect(page.getByTestId("remaining")).toHaveText("฿0.01");
  await expect(page.getByRole("button", { name: "Save transaction" })).toBeDisabled();
  await shot(page, "08-rule-mismatch-ui");

  // Bypass the UI: the API itself refuses and stores nothing.
  const accounts = (await (await page.request.get("/api/accounts")).json()).accounts as { id: number; name: string }[];
  const id = (n: string) => accounts.find((a) => a.name === n)!.id;
  const res = await page.request.post("/api/transactions", {
    headers: { Origin: "http://localhost:5173" },
    data: { kind: "PAYMENT", accountId: id("KTC Credit Card"), date: today(), totalSatang: 185000,
      lines: [{ accountId: id("Dining"), amountSatang: 65000 }, { accountId: id("Groceries"), amountSatang: 119999 }] },
  });
  expect(res.status()).toBe(422);
  expect((await res.json()).error.code).toBe("ALLOCATION_MISMATCH");
  const history = await (await page.request.get("/api/transactions")).json();
  expect(history.total).toBe(0);
  await page.getByRole("navigation").getByRole("link", { name: "History" }).click();
  await expect(page.getByText("No transactions yet — record your first one.")).toBeVisible();
});
