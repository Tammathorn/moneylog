import { describe, expect, it } from "vitest";
import { formatThb, parseThb } from "../../src/domain/money.js";

describe("TEST-18 money parsing and formatting (AC-16, NFR-04)", () => {
  it("parses THB text with up to two decimals into exact satang", () => {
    expect(parseThb("12.5")).toBe(1251);
    expect(parseThb("0.1")).toBe(10);
    expect(parseThb("1,850.00")).toBe(185000);
    expect(parseThb("10000000")).toBe(1_000_000_000);
  });
  it("rejects three decimals, signs, text and empty input", () => {
    for (const bad of ["1.234", "-1", "+1", "abc", "", "1.", ".5", "1e3"]) expect(parseThb(bad)).toBeNull();
  });
  it("formats satang as baht with separators and a sign", () => {
    expect(formatThb(1234567)).toBe("฿12,345.67");
    expect(formatThb(-500)).toBe("-฿5.00");
    expect(formatThb(0)).toBe("฿0.00");
  });
});
