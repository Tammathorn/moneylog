import { describe, expect, it } from "vitest";
import { parseAccountInput, parseAccountPatch, sameName } from "../../src/domain/account-rules.js";

describe("TEST-60 account name, type and subtype rules (AC-44, F-09 §3 steps 2-4)", () => {
  it("accepts a valid Cash/Bank account and trims the name", () => {
    expect(parseAccountInput({ name: "  SCB Savings ", type: "CASH", subtype: "BANK" })).toEqual({
      ok: true, value: { name: "SCB Savings", type: "CASH", subtype: "BANK" },
    });
  });

  it("rejects a blank or 61-character name and accepts 60 characters", () => {
    for (const name of ["", "   ", undefined, 12, "x".repeat(61)]) {
      const r = parseAccountInput({ name, type: "EXPENSE" });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(Object.keys(r.fields)).toEqual(["name"]);
    }
    expect(parseAccountInput({ name: "x".repeat(60), type: "EXPENSE" }).ok).toBe(true);
  });

  it("rejects an unknown type", () => {
    const r = parseAccountInput({ name: "Thing", type: "SAVINGS" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fields.type).toBeDefined();
  });

  it.each([
    ["CASH", undefined], ["CASH", null], ["CASH", "CREDIT_CARD"], ["CASH", "PERSONAL"],
    ["LOAN_TAKEN", undefined], ["LOAN_TAKEN", "BANK"],
    ["LOAN_GIVEN", "CREDIT_CARD"], ["LOAN_GIVEN", "WALLET"],
    ["INCOME", "BANK"], ["EXPENSE", "OTHER"],
  ])("rejects %s with subtype %s", (type, subtype) => {
    const r = parseAccountInput({ name: "Thing", type, subtype });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fields.subtype).toBeDefined();
  });

  it.each([
    ["CASH", "WALLET", "WALLET"], ["CASH", "BANK", "BANK"],
    ["LOAN_TAKEN", "CREDIT_CARD", "CREDIT_CARD"], ["LOAN_TAKEN", "PERSONAL", "PERSONAL"], ["LOAN_TAKEN", "OTHER", "OTHER"],
    ["LOAN_GIVEN", undefined, "PERSONAL"], ["LOAN_GIVEN", "OTHER", "OTHER"],
    ["INCOME", undefined, null], ["EXPENSE", null, null],
  ])("accepts %s with subtype %s (stored as %s)", (type, subtype, stored) => {
    const r = parseAccountInput({ name: "Thing", type, subtype });
    expect(r).toEqual({ ok: true, value: { name: "Thing", type, subtype: stored } });
  });
});

describe("TEST-60 PATCH body rules (F-09 §3 step 5)", () => {
  it("needs at least one of name, isActive, type", () => {
    expect(parseAccountPatch({}).ok).toBe(false);
  });
  it("isActive must be a boolean", () => {
    const r = parseAccountPatch({ isActive: "no" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fields.isActive).toBeDefined();
  });
  it("accepts rename, archive and type change", () => {
    expect(parseAccountPatch({ name: " KBank Main " })).toEqual({ ok: true, value: { name: "KBank Main" } });
    expect(parseAccountPatch({ isActive: false })).toEqual({ ok: true, value: { isActive: false } });
    expect(parseAccountPatch({ type: "LOAN_TAKEN", subtype: "PERSONAL" })).toEqual({
      ok: true, value: { type: "LOAN_TAKEN", subtype: "PERSONAL" },
    });
  });
  it("applies the name and subtype rules to a patch too", () => {
    expect(parseAccountPatch({ name: "" }).ok).toBe(false);
    expect(parseAccountPatch({ type: "CASH" }).ok).toBe(false);
  });
});

describe("TEST-61 names compare trimmed and case-insensitive (AC-45)", () => {
  it("treats different case and spaces as the same name", () => {
    expect(sameName("KBank Savings", " kbank savings ")).toBe(true);
    expect(sameName("KBank Savings", "KBANK SAVINGS")).toBe(true);
  });
  it("keeps different names different", () => {
    expect(sameName("KBank Savings", "KBank Saving")).toBe(false);
  });
});
