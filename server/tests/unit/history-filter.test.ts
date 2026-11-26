import { describe, expect, it } from "vitest";
import { parseHistoryFilter } from "../../src/domain/history-filter.js";

// TEST-81 - F-11 query rules (contract docs/sprints/sprint-2/F-11-history-filter.md §3).
describe("TEST-81 parseHistoryFilter (AC-59)", () => {
  it("parses a full valid query into a typed filter", () => {
    expect(parseHistoryFilter({
      from: "2026-11-01", to: "2026-11-30", accountId: "5", kind: "PAYMENT", q: "  central ", minSatang: "10000", maxSatang: "500000",
      favourite: "true", limit: "20", offset: "40",
    })).toEqual({ ok: true, value: {
      from: "2026-11-01", to: "2026-11-30", accountId: 5, kind: "PAYMENT", q: "central", minSatang: 10000, maxSatang: 500000,
      favourite: true, limit: 20, offset: 40,
    } });
  });

  it("an empty query gives the Sprint 1 defaults", () => {
    expect(parseHistoryFilter({})).toEqual({ ok: true, value: { limit: 50, offset: 0 } });
  });

  it("empty strings and favourite=false mean no filter", () => {
    expect(parseHistoryFilter({ from: "", q: "  ", kind: "", favourite: "false" })).toEqual({ ok: true, value: { limit: 50, offset: 0 } });
  });

  it("clamps limit and offset like Sprint 1", () => {
    expect(parseHistoryFilter({ limit: "500", offset: "-3" })).toEqual({ ok: true, value: { limit: 100, offset: 0 } });
    expect(parseHistoryFilter({ limit: "0" })).toEqual({ ok: true, value: { limit: 50, offset: 0 } });
  });

  it.each([
    [{ from: "2026-02-30" }, "from"],
    [{ to: "26-11-01" }, "to"],
    [{ from: "2026-11-30", to: "2026-11-01" }, "from"],
    [{ minSatang: "-1" }, "minSatang"],
    [{ minSatang: "1.5" }, "minSatang"],
    [{ maxSatang: "1000000001" }, "maxSatang"],
    [{ minSatang: "500", maxSatang: "100" }, "minSatang"],
    [{ kind: "OTHER" }, "kind"],
    [{ accountId: "abc" }, "accountId"],
    [{ accountId: "0" }, "accountId"],
    [{ favourite: "yes" }, "favourite"],
    [{ q: "x".repeat(101) }, "q"],
  ])("rejects %j naming %s", (query, field) => {
    const r = parseHistoryFilter(query);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fields[field]).toBeDefined();
  });

  it("accepts the boundaries: 100-character text, 0 and 1,000,000,000 satang, from = to", () => {
    expect(parseHistoryFilter({ q: "x".repeat(100), minSatang: "0", maxSatang: "1000000000", from: "2026-11-01", to: "2026-11-01" }).ok).toBe(true);
  });
});
