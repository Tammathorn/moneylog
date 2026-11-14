import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../src/lib/password.js";

describe("TEST-07 password hashing (AC-07, NFR-02)", () => {
  it("stores scrypt hashes that differ per call and verify only the right password", () => {
    const a = hashPassword("Secret-123");
    const b = hashPassword("Secret-123");
    expect(a).toMatch(/^scrypt\$16384\$8\$1\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(a).not.toContain("Secret-123");
    expect(a).not.toBe(b);
    expect(verifyPassword(a, "Secret-123")).toBe(true);
    expect(verifyPassword(a, "secret-123")).toBe(false);
    expect(verifyPassword(null, "Secret-123")).toBe(false);
    expect(verifyPassword("garbage", "Secret-123")).toBe(false);
  });
});
