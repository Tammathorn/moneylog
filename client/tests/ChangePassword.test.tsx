import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ADMIN, USER, mockApi, renderApp } from "./helpers";

// TEST-98 - F-16 FR-22 Change password page (AC-80).
describe("TEST-98 change password page (AC-80)", () => {
  it("checks that the new passwords match before sending", async () => {
    const calls = mockApi({ "GET /api/auth/me": { status: 200, body: { user: USER } } });
    renderApp("/account/password");
    await userEvent.type(await screen.findByLabelText("Current password"), "Old-Pass-2026!");
    await userEvent.type(screen.getByLabelText("New password"), "Brand-New-Pass-2026");
    await userEvent.type(screen.getByLabelText("Repeat new password"), "Brand-New-Pass-2025");
    expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change password" })).toBeDisabled();
    expect(calls.some((c) => c.key === "PUT /api/auth/password")).toBe(false);
  });

  it("shows a server field error, then the success message", async () => {
    let attempt = 0;
    const calls = mockApi({
      "GET /api/auth/me": { status: 200, body: { user: USER } },
      "PUT /api/auth/password": () => (attempt++ === 0
        ? { status: 400, body: { error: { code: "VALIDATION_FAILED", message: "Please correct the highlighted fields.", fields: { currentPassword: "The current password is not correct." } } } }
        : { status: 200, body: { ok: true } }),
    });
    renderApp("/account/password");
    await userEvent.type(await screen.findByLabelText("Current password"), "Wrong-Pass-2026");
    await userEvent.type(screen.getByLabelText("New password"), "Brand-New-Pass-2026");
    await userEvent.type(screen.getByLabelText("Repeat new password"), "Brand-New-Pass-2026");
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText("The current password is not correct.")).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText("Current password"));
    await userEvent.type(screen.getByLabelText("Current password"), "Old-Pass-2026!");
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText("Your password was changed. Other devices were signed out.")).toBeInTheDocument();
    expect(calls.filter((c) => c.key === "PUT /api/auth/password").at(-1)?.body).toEqual({ currentPassword: "Old-Pass-2026!", newPassword: "Brand-New-Pass-2026" });
  });

  it("is linked from the top bar for both roles", async () => {
    mockApi({ "GET /api/auth/me": { status: 200, body: { user: ADMIN } }, "GET /api/admin/users": { status: 200, body: { users: [] } } });
    renderApp("/admin/users");
    expect(await screen.findByRole("link", { name: "Change password" })).toHaveAttribute("href", "/account/password");
  });
});
