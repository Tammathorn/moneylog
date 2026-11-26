import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { USER, account, mockApi, renderApp } from "./helpers";

// F-10 / F-12 on the transaction detail page (contract docs/sprints/sprint-2/F-10-F-12-correction-favourites.md).
const ref = (id: number, name: string, type: string) => ({ id, name, type });
export const PURCHASE = {
  id: 42, kind: "PAYMENT", date: "2026-11-10", totalSatang: 185000, description: "Central World", createdAt: "2026-11-10T05:00:00.000Z",
  updatedAt: null, isFavourite: false, account: ref(3, "KTC Credit Card", "LOAN_TAKEN"),
  lines: [{ id: 1, amountSatang: 65000, note: null, account: ref(7, "Dining", "EXPENSE") }, { id: 2, amountSatang: 120000, note: "weekly", account: ref(8, "Groceries", "EXPENSE") }],
};
const ACCOUNTS = [account(1, "KBank Savings", "CASH"), account(3, "KTC Credit Card", "LOAN_TAKEN"), account(7, "Dining", "EXPENSE"), account(8, "Groceries", "EXPENSE")];

describe("TEST-77 edit and delete from the detail page (AC-57)", () => {
  it("Edit opens the form pre-filled and Save changes sends a PUT", async () => {
    const calls = mockApi({
      "GET /api/auth/me": { status: 200, body: { user: USER } },
      "GET /api/accounts": { status: 200, body: { accounts: ACCOUNTS } },
      "GET /api/transactions/42": { status: 200, body: { transaction: PURCHASE } },
      "PUT /api/transactions/42": { status: 200, body: { transaction: { ...PURCHASE, totalSatang: 165000, updatedAt: "2026-11-26T02:00:00.000Z",
        lines: [PURCHASE.lines[0], { ...PURCHASE.lines[1], amountSatang: 100000 }] } } },
    });
    renderApp("/transactions/42");
    await userEvent.click(await screen.findByRole("link", { name: "Edit" }));
    expect(await screen.findByRole("heading", { name: "Edit transaction" })).toBeInTheDocument();
    expect(screen.getByLabelText("Paid from *")).toHaveValue("3");
    expect(screen.getByLabelText("Total (THB) *")).toHaveValue("1850.00");
    expect(screen.getByLabelText("Line 2 amount")).toHaveValue("1200.00");
    expect(screen.getByLabelText("Line 2 note")).toHaveValue("weekly");
    await userEvent.clear(screen.getByLabelText("Total (THB) *"));
    await userEvent.type(screen.getByLabelText("Total (THB) *"), "1650");
    await userEvent.clear(screen.getByLabelText("Line 2 amount"));
    await userEvent.type(screen.getByLabelText("Line 2 amount"), "1000");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("฿1,650.00", { selector: "dd, dd *" })).toBeInTheDocument();
    expect(calls.find((c) => c.key === "PUT /api/transactions/42")?.body).toMatchObject({
      kind: "PAYMENT", accountId: 3, date: "2026-11-10", totalSatang: 165000,
      lines: [{ accountId: 7, amountSatang: 65000 }, { accountId: 8, amountSatang: 100000, note: "weekly" }],
    });
  });

  it("Delete asks for confirmation, then deletes and returns to History", async () => {
    const calls = mockApi({
      "GET /api/auth/me": { status: 200, body: { user: USER } },
      "GET /api/transactions/42": { status: 200, body: { transaction: PURCHASE } },
      "DELETE /api/transactions/42": { status: 204 },
      "GET /api/transactions": { status: 200, body: { items: [], total: 0 } },
    });
    renderApp("/transactions/42");
    await userEvent.click(await screen.findByRole("button", { name: "Delete" }));
    expect(screen.getByText("Delete this transaction? Balances will be recalculated.")).toBeInTheDocument();
    expect(calls.some((c) => c.key.startsWith("DELETE"))).toBe(false);
    await userEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    expect(await screen.findByRole("heading", { name: "History" })).toBeInTheDocument();
    expect(calls.some((c) => c.key === "DELETE /api/transactions/42")).toBe(true);
  });
});

describe("TEST-79 favourite star (AC-67)", () => {
  it("toggles the flag on the detail page", async () => {
    const calls = mockApi({
      "GET /api/auth/me": { status: 200, body: { user: USER } },
      "GET /api/transactions/42": { status: 200, body: { transaction: PURCHASE } },
      "PUT /api/transactions/42/favourite": { status: 200, body: { transaction: { ...PURCHASE, isFavourite: true } } },
    });
    renderApp("/transactions/42");
    const star = await screen.findByRole("button", { name: "Mark as favourite" });
    expect(star).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(star);
    await waitFor(() => expect(screen.getByRole("button", { name: "Remove from favourites" })).toHaveAttribute("aria-pressed", "true"));
    expect(calls.find((c) => c.key === "PUT /api/transactions/42/favourite")?.body).toEqual({ isFavourite: true });
  });

  it("filters History to favourites only", async () => {
    const urls: string[] = [];
    mockApi({
      "GET /api/auth/me": { status: 200, body: { user: USER } },
      "GET /api/transactions": () => ({ status: 200, body: { items: [PURCHASE], total: 1 } }),
    });
    const spy = globalThis.fetch as unknown as { mock: { calls: [RequestInfo][] } };
    renderApp("/transactions");
    await userEvent.click(await screen.findByLabelText("Favourites only"));
    await userEvent.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() => {
      for (const [u] of spy.mock.calls) urls.push(String(u));
      expect(urls.some((u) => u.includes("/api/transactions?") && u.includes("favourite=true"))).toBe(true);
    });
  });
});

describe("TEST-78 Duplicate (AC-65, AC-66, BR-18)", () => {
  it("opens New transaction pre-filled with today's date and saves nothing until Save", async () => {
    const calls = mockApi({
      "GET /api/auth/me": { status: 200, body: { user: USER } },
      "GET /api/accounts": { status: 200, body: { accounts: ACCOUNTS } },
      "GET /api/transactions/42": { status: 200, body: { transaction: { ...PURCHASE, date: "2026-10-01" } } },
    });
    renderApp("/transactions/new?from=42");
    expect(await screen.findByRole("heading", { name: "New transaction" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Paid from *")).toHaveValue("3"));
    expect(screen.getByLabelText("Date *")).not.toHaveValue("2026-10-01");
    expect(screen.getByLabelText("Description")).toHaveValue("Central World");
    expect(screen.getByLabelText("Line 1 amount")).toHaveValue("650.00");
    expect(screen.getByRole("button", { name: "Save transaction" })).toBeEnabled();
    expect(calls.some((c) => c.key === "POST /api/transactions")).toBe(false);
  });

  it("leaves an archived line account empty with a message", async () => {
    mockApi({
      "GET /api/auth/me": { status: 200, body: { user: USER } },
      "GET /api/accounts": { status: 200, body: { accounts: [ACCOUNTS[0], ACCOUNTS[1], { ...ACCOUNTS[2], isActive: false }, ACCOUNTS[3]] } },
      "GET /api/transactions/42": { status: 200, body: { transaction: PURCHASE } },
    });
    renderApp("/transactions/new?from=42");
    expect(await screen.findByText("Dining is archived — choose another account.")).toBeInTheDocument();
    expect(screen.getByLabelText("Line 1 account")).toHaveValue("");
    expect(screen.getByLabelText("Line 2 account")).toHaveValue("8");
  });
});
