import { describe, expect, it } from "vitest";
import { readSeedConfig } from "../../src/seed/seed-data.js";

describe("TEST-56 seed settings come from the environment (R-02)", () => {
  it("requires ADMIN_PASSWORD and creates demo users only when asked", () => {
    expect(() => readSeedConfig({})).toThrow(/ADMIN_PASSWORD/);
    expect(readSeedConfig({ ADMIN_PASSWORD: "a".repeat(12) })).toEqual({ adminPassword: "a".repeat(12), demoPassword: null });
    expect(() => readSeedConfig({ ADMIN_PASSWORD: "a".repeat(12), SEED_DEMO_DATA: "true" })).toThrow(/DEMO_USER_PASSWORD/);
    expect(readSeedConfig({ ADMIN_PASSWORD: "a".repeat(12), SEED_DEMO_DATA: "true", DEMO_USER_PASSWORD: "d".repeat(12) }).demoPassword).toBe("d".repeat(12));
  });
});
