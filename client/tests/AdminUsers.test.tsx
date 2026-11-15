import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ADMIN, mockApi, renderApp } from "./helpers";

const row = (id: number, email: string, isActive: boolean, role = "USER") => ({ id, email, displayName: email, role, isActive, createdAt: "2026-11-14T00:00:00Z" });

describe("TEST-49 users page (AC-42)", () => {
  it("disables another user and shows the new status; no Disable on own row", async () => {
    mockApi({
      "GET /api/auth/me": { status: 200, body: { user: ADMIN } },
      "GET /api/admin/users": { status: 200, body: { users: [row(9, "admin@moneylog.test", true, "ADMIN"), row(2, "bob@moneylog.test", true)] } },
      "PATCH /api/admin/users/2": { status: 200, body: { user: row(2, "bob@moneylog.test", false) } },
    });
    renderApp("/admin/users");
    expect(await screen.findByTestId("status-bob@moneylog.test")).toHaveTextContent("Enabled");
    expect(screen.queryByRole("button", { name: "Disable admin@moneylog.test" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Disable bob@moneylog.test" }));
    expect(await screen.findByTestId("status-bob@moneylog.test")).toHaveTextContent("Disabled");
    expect(screen.getByRole("button", { name: "Enable bob@moneylog.test" })).toBeInTheDocument();
  });
});
