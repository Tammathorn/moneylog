import { describe, expect, it } from "vitest";
import { parseTransactionInput } from "../../src/domain/transaction-input.js";

const NOW = new Date("2026-11-14T10:00:00+07:00"); // today in Bangkok = 2026-11-14
const valid = () => ({
  kind: "PAYMENT", accountId: 1, date: "2026-11-14", totalSatang: 100, description: "  shop  ",
  lines: [{ accountId: 2, amountSatang: 100, note: "x" }],
});
const fieldsOf = (body: unknown) => {
  const r = parseTransactionInput(body, NOW);
  return r.ok ? {} : r.fields;
};

describe("TEST-33 input boundaries (AC-28, BR-02, BR-10, BR-11)", () => {
  it("accepts the valid side of every boundary", () => {
    const r = parseTransactionInput(valid(), NOW);
    expect(r.ok && r.value.description).toBe("shop");
    const edge = { ...valid(), date: "2000-01-01", totalSatang: 1_000_000_000, description: "d".repeat(200),
      lines: [{ accountId: 2, amountSatang: 1_000_000_000 }] };
    expect(parseTransactionInput(edge, NOW).ok).toBe(true);
    const twenty = { ...valid(), totalSatang: 20, lines: Array.from({ length: 20 }, (_, i) => ({ accountId: i + 2, amountSatang: 1 })) };
    expect(parseTransactionInput(twenty, NOW).ok).toBe(true);
  });

  it.each([
    ["total 0", { totalSatang: 0 }, "totalSatang"],
    ["total negative", { totalSatang: -5 }, "totalSatang"],
    ["total fractional", { totalSatang: 10.5 }, "totalSatang"],
    ["total over limit", { totalSatang: 1_000_000_001 }, "totalSatang"],
    ["unknown kind", { kind: "REFUND" }, "kind"],
    ["account id text", { accountId: "1" }, "accountId"],
    ["tomorrow", { date: "2026-11-15" }, "date"],
    ["before 2000", { date: "1999-12-31" }, "date"],
    ["impossible date", { date: "2026-02-30" }, "date"],
    ["wrong format", { date: "10/11/2026" }, "date"],
    ["description 201 chars", { description: "d".repeat(201) }, "description"],
    ["no lines", { lines: [] }, "lines"],
    ["21 lines", { lines: Array.from({ length: 21 }, (_, i) => ({ accountId: i + 2, amountSatang: 1 })) }, "lines"],
    ["line amount 0", { lines: [{ accountId: 2, amountSatang: 0 }] }, "lines[0].amountSatang"],
    ["line note 101 chars", { lines: [{ accountId: 2, amountSatang: 100, note: "n".repeat(101) }] }, "lines[0].note"],
  ])("rejects %s", (_name, over, field) => {
    expect(Object.keys(fieldsOf({ ...valid(), ...over }))).toContain(field);
  });

  it("ignores a userId sent in the body", () => {
    const r = parseTransactionInput({ ...valid(), userId: 42 }, NOW);
    expect(r.ok && "userId" in r.value).toBe(false);
  });
});
