import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

describe("TEST-67 account management on the Accounts page (AC-50)", () => {
  const archived = { ...account(5, "Old Wallet", "CASH", 1_000), isActive: false };

  it("creates an account and shows it in its type group", async () => {
    const calls = mockApi({
      "GET /api/auth/me": { status: 200, body: { user: USER } },
      "GET /api/accounts": { status: 200, body: { accounts: [account(1, "KBank Savings", "CASH", 0)] } },
      "POST /api/accounts": { status: 201, body: { account: { ...account(7, "SCB Savings", "CASH", 0), subtype: "BANK", inUse: false } } },
    });
    renderApp("/accounts");
    await userEvent.click(await screen.findByRole("button", { name: "New account" }));
    await userEvent.type(screen.getByLabelText("Account name"), "SCB Savings");
    await userEvent.selectOptions(screen.getByLabelText("Account type"), "CASH");
    await userEvent.selectOptions(screen.getByLabelText("Subtype"), "BANK");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByTestId("balance-SCB Savings")).toHaveTextContent("฿0.00");
    expect(calls.find((c) => c.key === "POST /api/accounts")?.body).toEqual({ name: "SCB Savings", type: "CASH", subtype: "BANK" });
  });

  it("archives an account into the Archived section and restores it", async () => {
    const calls = mockApi({
      "GET /api/auth/me": { status: 200, body: { user: USER } },
      "GET /api/accounts": { status: 200, body: { accounts: [account(2, "Wallet", "CASH", 500), archived] } },
      "PATCH /api/accounts/2": { status: 200, body: { account: { ...account(2, "Wallet", "CASH", 500), isActive: false } } },
    });
    renderApp("/accounts");
    const section = await screen.findByRole("region", { name: "Archived accounts" });
    expect(within(section).getByText("Old Wallet")).toBeInTheDocument();
    expect(within(section).getByRole("button", { name: "Restore Old Wallet" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Archive Wallet" }));
    expect(await within(section).findByText("Wallet")).toBeInTheDocument();
    expect(calls.find((c) => c.key === "PATCH /api/accounts/2")?.body).toEqual({ isActive: false });
  });

  it("offers Delete only for unused accounts and shows the in-use error", async () => {
    mockApi({
      "GET /api/auth/me": { status: 200, body: { user: USER } },
      "GET /api/accounts": { status: 200, body: { accounts: [
        { ...account(3, "Dining", "EXPENSE", 0), inUse: true }, { ...account(4, "Temp", "EXPENSE", 0), inUse: false },
      ] } },
      "DELETE /api/accounts/4": { status: 204 },
    });
    renderApp("/accounts");
    expect(await screen.findByRole("button", { name: "Delete Temp" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete Dining" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Delete Temp" }));
    await waitFor(() => expect(screen.queryByText("Temp")).toBeNull());
  });
});
