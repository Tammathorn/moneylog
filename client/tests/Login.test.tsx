import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockApi, renderApp } from "./helpers";

describe("TEST-10 sign-in form (AC-08)", () => {
  it("shows the server's sign-in failure message and stays on the form", async () => {
    mockApi({
      "GET /api/auth/me": { status: 401, body: { error: { code: "AUTH_REQUIRED", message: "x" } } },
      "POST /api/auth/login": { status: 401, body: { error: { code: "INVALID_CREDENTIALS", message: "E-mail or password is incorrect." } } },
    });
    renderApp("/login");
    await userEvent.type(await screen.findByLabelText("E-mail"), "alice@moneylog.test");
    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("E-mail or password is incorrect.");
    expect(screen.getByRole("heading", { name: "Sign in to MoneyLog" })).toBeInTheDocument();
  });
});
