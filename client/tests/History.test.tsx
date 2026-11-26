import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { USER, mockApi, renderApp } from "./helpers";

const tx = (id: number, date: string, description: string) => ({
  id, kind: "PAYMENT", date, totalSatang: 185000, description, createdAt: "2026-11-14T00:00:00Z",
  account: { id: 3, name: "KTC Credit Card", type: "LOAN_TAKEN" }, lines: [],
});

describe("TEST-40 history (AC-34)", () => {
  it("shows the empty state when there are no transactions", async () => {
    mockApi({ "GET /api/auth/me": { status: 200, body: { user: USER } }, "GET /api/transactions": { status: 200, body: { items: [], total: 0 } } });
    renderApp("/transactions");
    expect(await screen.findByText("No transactions yet — record your first one.")).toBeInTheDocument();
  });
  it("shows one row per transaction", async () => {
    mockApi({ "GET /api/auth/me": { status: 200, body: { user: USER } }, "GET /api/transactions": { status: 200, body: { items: [tx(2, "2026-11-10", "Central"), tx(1, "2026-11-05", "Big C")], total: 2 } } });
    renderApp("/transactions");
    const table = await screen.findByRole("table", { name: "Transactions" });
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    expect(within(table).getByText("Central")).toBeInTheDocument();
  });
});

describe("TEST-86 filter bar and pager (AC-62)", () => {
  const page = (n: number, start: number) => Array.from({ length: n }, (_, i) => tx(start + i, "2026-11-10", `Item ${start + i}`));
  const urls = () => (globalThis.fetch as unknown as { mock: { calls: [RequestInfo][] } }).mock.calls.map(([u]) => String(u)).filter((u) => u.startsWith("/api/transactions"));

  it("sends the filters, pages with Next/Previous, and clears", async () => {
    mockApi({
      "GET /api/auth/me": { status: 200, body: { user: USER } },
      "GET /api/accounts": { status: 200, body: { accounts: [{ id: 7, name: "Dining", type: "EXPENSE", subtype: null, openingBalanceSatang: 0, openingDate: null, balanceSatang: 0, isActive: true }] } },
      "GET /api/transactions": () => ({ status: 200, body: { items: page(50, 1), total: 120 } }),
    });
    renderApp("/transactions");
    await screen.findByRole("table", { name: "Transactions" });
    await userEvent.type(screen.getByLabelText("Text"), "central");
    await userEvent.type(screen.getByLabelText("Min ฿"), "100");
    await userEvent.selectOptions(screen.getByLabelText("Kind"), "PAYMENT");
    await userEvent.selectOptions(screen.getByLabelText("Account"), "7");
    await userEvent.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(urls().at(-1)).toContain("q=central"));
    const last = new URLSearchParams(urls().at(-1)!.split("?")[1]);
    expect(Object.fromEntries(last)).toMatchObject({ q: "central", minSatang: "10000", kind: "PAYMENT", accountId: "7" });
    expect(await screen.findByText("Showing 1–50 of 120")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(urls().at(-1)).toContain("offset=50"));
    expect(await screen.findByText("Showing 51–100 of 120")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Clear" }));
    await waitFor(() => expect(urls().at(-1)).toBe("/api/transactions"));
  });

  it("shows the no-match message for an empty filtered result", async () => {
    mockApi({
      "GET /api/auth/me": { status: 200, body: { user: USER } },
      "GET /api/accounts": { status: 200, body: { accounts: [] } },
      "GET /api/transactions": { status: 200, body: { items: [], total: 0 } },
    });
    renderApp("/transactions?q=zzz");
    expect(await screen.findByText("No transactions match these filters.")).toBeInTheDocument();
  });

  it("blocks Apply while Min is above Max", async () => {
    mockApi({
      "GET /api/auth/me": { status: 200, body: { user: USER } },
      "GET /api/accounts": { status: 200, body: { accounts: [] } },
      "GET /api/transactions": { status: 200, body: { items: [], total: 0 } },
    });
    renderApp("/transactions");
    await userEvent.type(await screen.findByLabelText("Min ฿"), "500");
    await userEvent.type(screen.getByLabelText("Max ฿"), "100");
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    expect(screen.getByText("Min must not be above Max.")).toBeInTheDocument();
  });
});
