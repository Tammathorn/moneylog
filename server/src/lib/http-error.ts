import type { NextFunction, Request, Response } from "express";

// NFR-06 - one error shape: { error: { code, message, fields? } }.
export function sendError(res: Response, status: number, code: string, message: string, fields?: Record<string, string>): void {
  res.status(status).json({ error: fields ? { code, message, fields } : { code, message } });
}

export const sendValidation = (res: Response, fields: Record<string, string>) =>
  sendError(res, 400, "VALIDATION_FAILED", "Please correct the highlighted fields.", fields);

export const sendNotFound = (res: Response) => sendError(res, 404, "NOT_FOUND", "That record was not found.");

// Last middleware. Details go to the server log only.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  console.error(err);
  if (res.headersSent) return;
  sendError(res, 500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
}

// Wraps an async route so a rejected promise reaches errorHandler.
export const handle =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

// Path ids: positive integers only; anything else is treated as not found.
export function parseId(value: string): number | null {
  return /^[1-9]\d{0,9}$/.test(value) && Number(value) <= 2_147_483_647 ? Number(value) : null;
}
