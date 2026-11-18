import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { USER, mockApi, renderApp } from "./helpers";

describe("TEST-57 footer shows the running release (Lab 5 R-08)", () => {
  it("shows the short commit from /api/version on the sign-in page and inside the app", async () => {
    mockApi({ "GET /api/auth/me": { status: 401, body: { error: { code: "AUTH_REQUIRED", message: "x" } } } });
    renderApp("/login");
    expect(await screen.findByText("0123456")).toBeInTheDocument();
  });
  it("is shown for a signed-in user", async () => {
    mockApi({ "GET /api/auth/me": { status: 200, body: { user: USER } }, "GET /api/transactions": { status: 200, body: { items: [], total: 0 } } });
    renderApp("/transactions");
    const el = await screen.findByTestId("release-commit");
    await waitFor(() => expect(el).toHaveTextContent("0123456"));
  });
});
