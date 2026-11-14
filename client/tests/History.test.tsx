import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
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
