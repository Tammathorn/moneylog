import { describe, expect, it } from "vitest";
import { SESSION_TTL_MS, hashSessionToken, generateSessionToken, isSessionExpired, sessionExpiry } from "../../src/lib/session.js";

describe("TEST-06 session expiry (AC-06, NFR-03)", () => {
  it("expires exactly 8 hours after creation, absolutely", () => {
    const created = new Date("2026-11-14T00:00:00Z");
    const expires = sessionExpiry(created);
    expect(SESSION_TTL_MS).toBe(8 * 60 * 60 * 1000);
    expect(isSessionExpired(expires, new Date(expires.getTime() - 1))).toBe(false);
    expect(isSessionExpired(expires, expires)).toBe(true);
  });

  it("uses 256-bit random tokens and stores only their SHA-256", () => {
    const token = generateSessionToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(generateSessionToken()).not.toBe(token);
    expect(hashSessionToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSessionToken(token)).not.toBe(token);
  });
});
