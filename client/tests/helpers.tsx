import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { AuthProvider } from "../src/auth";
import { App } from "../src/App";

type Handler = (init: RequestInit | undefined) => { status: number; body?: unknown };
// Route table: "METHOD /api/path" -> handler. Unlisted calls fail the test loudly.
export function mockApi(routes: Record<string, Handler | { status: number; body?: unknown }>) {
  const calls: { key: string; body: unknown }[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input).split("?")[0];
    const key = `${init?.method ?? "GET"} ${url}`;
    calls.push({ key, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const route = routes[key] ?? (key === "GET /api/version" ? { status: 200, body: { service: "moneylog", commit: "0123456789abcdef0123456789abcdef01234567" } } : undefined);
    if (!route) throw new Error(`Unmocked ${key}`);
    const { status, body } = typeof route === "function" ? route(init) : route;
    return new Response(status === 204 ? null : JSON.stringify(body ?? {}), { status, headers: { "Content-Type": "application/json" } });
  });
  return calls;
}

export const USER = { id: 1, email: "alice@moneylog.test", displayName: "Alice Chaiyo", role: "USER" };
export const ADMIN = { id: 9, email: "admin@moneylog.test", displayName: "Pim Admin", role: "ADMIN" };

export function renderApp(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><AuthProvider><App /></AuthProvider></MemoryRouter>);
}

export const account = (id: number, name: string, type: string, balanceSatang = 0) =>
  ({ id, name, type, subtype: null, openingBalanceSatang: 0, openingDate: null, balanceSatang, isActive: true });
