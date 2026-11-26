import { describe, expect, it } from "vitest";
import { checkNewPassword } from "../../src/domain/password-policy.js";

// TEST-94 - F-16 FR-22 new-password rules (AC-78).
describe("TEST-94 checkNewPassword (AC-78)", () => {
  const current = "Old-Pass-2026!";
  it.each([["x".repeat(11)], ["x".repeat(129)], [""], [undefined], [42]])("rejects %j", (pw) => {
    const r = checkNewPassword(current, pw);
    expect(r).toEqual({ ok: false, fields: { newPassword: "Use 12 to 128 characters." } });
  });
  it("rejects the current password again", () => {
    expect(checkNewPassword(current, current)).toEqual({ ok: false, fields: { newPassword: "Choose a password different from the current one." } });
  });
  it("accepts 12 and 128 characters", () => {
    expect(checkNewPassword(current, "x".repeat(12))).toEqual({ ok: true, value: "x".repeat(12) });
    expect(checkNewPassword(current, "y".repeat(128))).toEqual({ ok: true, value: "y".repeat(128) });
  });
  it("requires the current password to be a string", () => {
    expect(checkNewPassword(undefined, "x".repeat(12))).toEqual({ ok: false, fields: { currentPassword: "Enter your current password." } });
  });
});
