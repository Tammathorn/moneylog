import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { USER, account, mockApi, renderApp } from "./helpers";

describe("TEST-20 accounts page (AC-17, BR-14)", () => {
  it("formats balances in baht and marks a negative cash balance", async () => {
    mockApi({
      "GET /api/auth/me": { status: 200, body: { user: USER } },
      "GET /api/accounts": { status: 200, body: { accounts: [
        account(1, "KBank Savings", "CASH", 3_400_000), account(2, "Wallet", "CASH", -500), account(3, "KTC Credit Card", "LOAN_TAKEN", 85_000),
      ] } },
    });
    renderApp("/accounts");
    expect(await screen.findByTestId("balance-KBank Savings")).toHaveTextContent("฿34,000.00");
    expect(screen.getByTestId("balance-Wallet")).toHaveTextContent("-฿5.00 (negative)");
    expect(screen.getByTestId("balance-KTC Credit Card")).toHaveTextContent("฿850.00");
    expect(screen.getByRole("button", { name: "Set opening balance for Wallet" })).toBeInTheDocument();
  });
});
