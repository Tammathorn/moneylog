import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { USER, account, mockApi, renderApp } from "./helpers";

const ACCOUNTS = [account(1, "KBank Savings", "CASH"), account(3, "KTC Credit Card", "LOAN_TAKEN"), account(7, "Dining", "EXPENSE"), account(8, "Groceries", "EXPENSE"), account(5, "Salary", "INCOME")];

describe("TEST-37 transaction form (AC-31)", () => {
  it("updates Remaining live, enables Save only at zero, and keeps values on a server rule error", async () => {
    const calls = mockApi({
      "GET /api/auth/me": { status: 200, body: { user: USER } },
      "GET /api/accounts": { status: 200, body: { accounts: ACCOUNTS } },
      "POST /api/transactions": { status: 422, body: { error: { code: "ACCOUNT_NOT_FOUND", message: "One of the chosen accounts was not found." } } },
    });
    renderApp("/transactions/new");
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText("Paid from *"), "3");
    await user.type(screen.getByLabelText("Total (THB) *"), "1850");
    await user.selectOptions(screen.getByLabelText("Line 1 account"), "7");
    await user.type(screen.getByLabelText("Line 1 amount"), "650");
    expect(screen.getByTestId("remaining")).toHaveTextContent("฿1,200.00");
    const save = screen.getByRole("button", { name: "Save transaction" });
    expect(save).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Add line" }));
    await user.selectOptions(screen.getByLabelText("Line 2 account"), "8");
    await user.type(screen.getByLabelText("Line 2 amount"), "1199.99");
    expect(screen.getByTestId("remaining")).toHaveTextContent("฿0.01");
    expect(save).toBeDisabled();
    await user.clear(screen.getByLabelText("Line 2 amount"));
    await user.type(screen.getByLabelText("Line 2 amount"), "1200");
    expect(screen.getByTestId("remaining")).toHaveTextContent("฿0.00");
    expect(save).toBeEnabled();
    // The header account is not offered as a line account (BR-05) and income is not offered for a payment (BR-04).
    expect(screen.getByLabelText("Line 1 account")).not.toHaveTextContent("KTC Credit Card");
    expect(screen.getByLabelText("Line 1 account")).not.toHaveTextContent("Salary");

    await user.click(save);
    expect(await screen.findByRole("alert")).toHaveTextContent("One of the chosen accounts was not found.");
    expect(screen.getByLabelText("Total (THB) *")).toHaveValue("1850");
    expect(calls.find((c) => c.key === "POST /api/transactions")?.body).toMatchObject({
      kind: "PAYMENT", accountId: 3, totalSatang: 185000, lines: [{ accountId: 7, amountSatang: 65000 }, { accountId: 8, amountSatang: 120000 }],
    });
  });
});
