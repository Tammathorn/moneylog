import { expect, test, type Page } from "@playwright/test";
import { signIn, today } from "./support";

// Issue #60 / ISSUE-PARTNER-01 (Lab 6 UAT): a description of up to 200 characters is valid
// (BR-11, AC-28) and History, detail and the save confirmation must show it (FR-09, FR-10)
// without pushing the page wider than the screen, on desktop and on a phone.
const WIDTHS = [1280, 390] as const;

// 200 characters with no break opportunity (letters and digits only), and a 100-character note (max).
const UNBROKEN = "LongDescriptionNoSpaces0123456789".repeat(7).slice(0, 200);
const UNBROKEN_NOTE = "LongLineNoteNoSpaces0123456789".repeat(4).slice(0, 100);
// 200 characters of ordinary words.
const WITH_SPACES = "Interest from the long term deposit account at KBank ".repeat(4).slice(0, 200);

async function expectNoHorizontalOverflow(page: Page, view: string) {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 860 });
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect.soft(scrollWidth, `${view} at ${width}px: scrollWidth ${scrollWidth} > clientWidth ${clientWidth}`).toBeLessThanOrEqual(clientWidth);
  }
  await page.setViewportSize({ width: 1280, height: 860 });
}

// Each case uses its own user so History only holds that case's long description, and deletes
// its transaction afterwards so later specs (e.g. TEST-51: bob has no transactions) see the seed data.
let createdId: string | null = null;
test.afterEach(async ({ page }) => {
  if (createdId) {
    const res = await page.request.delete(`/api/transactions/${createdId}`, { headers: { Origin: "http://localhost:5173" } });
    expect(res.ok(), `cleanup DELETE /api/transactions/${createdId} -> ${res.status()}`).toBe(true);
  }
  createdId = null;
});

async function checkAllViews(page: Page, email: string, description: string, note?: string) {
  expect(description).toHaveLength(200);
  await signIn(page, email);

  await page.getByRole("navigation").getByRole("link", { name: "New transaction" }).click();
  await page.getByRole("button", { name: "Money received" }).click();
  await page.getByLabel("Received into *").selectOption({ label: "KBank Savings" });
  await page.getByLabel("Total (THB) *").fill("100");
  await page.getByLabel("Date *").fill(today());
  await page.getByLabel("Description").fill(description);
  await page.getByLabel("Line 1 account").selectOption({ label: "Interest" });
  await page.getByLabel("Line 1 amount").fill("100");
  if (note) await page.getByLabel("Line 1 note").fill(note);
  await page.getByRole("button", { name: "Save transaction" }).click();

  // 1. Transaction saved confirmation
  await expect(page.getByRole("heading", { name: "Transaction saved" })).toBeVisible();
  await expectNoHorizontalOverflow(page, "Transaction saved");
  const href = await page.getByRole("link", { name: "View transaction" }).getAttribute("href");
  expect(href).toMatch(/^\/transactions\/\d+$/);
  createdId = href!.split("/").pop()!;

  // 2. History
  await page.getByRole("navigation").getByRole("link", { name: "History" }).click();
  await expect(page.getByRole("table", { name: "Transactions" }).getByText(description)).toBeVisible();
  await expectNoHorizontalOverflow(page, "History");

  // 3. Detail /transactions/:id
  await page.goto(href!);
  await expect(page.getByText(description)).toBeVisible();
  if (note) await expect(page.getByRole("table", { name: "Lines" }).getByText(note)).toBeVisible();
  await expectNoHorizontalOverflow(page, "Detail");
}

test("TEST-101 a 200-character description with no spaces does not overflow saved, History or detail (#60)", async ({ page }) => {
  await checkAllViews(page, "bob@moneylog.test", UNBROKEN, UNBROKEN_NOTE);
});

test("TEST-102 a 200-character description with spaces does not overflow saved, History or detail (#60)", async ({ page }) => {
  await checkAllViews(page, "alice@moneylog.test", WITH_SPACES);
});
