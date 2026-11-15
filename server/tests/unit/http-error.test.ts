import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { errorHandler } from "../../src/lib/http-error.js";

describe("TEST-15 safe 500 errors (AC-13, NFR-06)", () => {
  it("returns a generic INTERNAL_ERROR with no stack, SQL or path", () => {
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), headersSent: false } as unknown as Response;
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = new Error('relation "secret_table" does not exist at /srv/app/src/x.ts:12');
    errorHandler(err, {} as Request, res, () => {});
    expect(res.status).toHaveBeenCalledWith(500);
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body).toEqual({ error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } });
    expect(JSON.stringify(body)).not.toMatch(/secret_table|\/srv|stack/);
    log.mockRestore();
  });
});
