import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { USER, mockApi, renderApp } from "./helpers";

// TEST-91 - F-13 Loans page (AC-72).
const LOANS = {
  given: [{ account: { id: 4, name: "Loan to Beam", subtype: "PERSONAL", isActive: true }, outstandingSatang: 300_000, history: [
    { transactionId: 12, date: "2026-11-05", kind: "PAYMENT", description: "Lent to Beam", changeSatang: 500_000, runningSatang: 500_000 },
    { transactionId: 15, date: "2026-11-20", kind: "RECEIPT", description: "Beam paid back", changeSatang: -200_000, runningSatang: 300_000 },
  ] }],
  taken: [{ account: { id: 3, name: "KTC Credit Card", subtype: "CREDIT_CARD", isActive: false }, outstandingSatang: 85_000, history: [
    { transactionId: null, date: "2026-10-01", kind: "OPENING", description: "Opening balance", changeSatang: 85_000, runningSatang: 85_000 },
  ] }],
  totalGivenSatang: 300_000, totalTakenSatang: 85_000,
};

describe("TEST-91 Loans page (AC-72)", () => {
  it("shows both sections with totals, outstanding and history rows", async () => {
    mockApi({ "GET /api/auth/me": { status: 200, body: { user: USER } }, "GET /api/loans": { status: 200, body: LOANS } });
    renderApp("/loans");
    const given = await screen.findByRole("region", { name: "Money others owe me" });
    expect(within(given).getByTestId("total-given")).toHaveTextContent("฿3,000.00");
    const beam = within(given).getByRole("table", { name: "Loan to Beam history" });
    expect(within(beam).getAllByRole("row")).toHaveLength(3);
    expect(within(beam).getByText("+฿5,000.00")).toBeInTheDocument();
    expect(within(beam).getByText("-฿2,000.00")).toBeInTheDocument();
    expect(within(beam).getByRole("link", { name: "Lent to Beam" })).toHaveAttribute("href", "/transactions/12");
    const taken = screen.getByRole("region", { name: "Money I owe" });
    expect(within(taken).getByTestId("total-taken")).toHaveTextContent("฿850.00");
    expect(within(taken).getByText("Archived")).toBeInTheDocument();
    expect(within(taken).getByText("Opening balance")).toBeInTheDocument();
  });

  it("shows the empty message when a section has no loans", async () => {
    mockApi({ "GET /api/auth/me": { status: 200, body: { user: USER } }, "GET /api/loans": { status: 200, body: { given: [], taken: [], totalGivenSatang: 0, totalTakenSatang: 0 } } });
    renderApp("/loans");
    expect(await screen.findAllByText("No loans here.")).toHaveLength(2);
  });
});
