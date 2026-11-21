import type { Request, RequestHandler, Response } from "express";
import type { Role, User } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { sendError } from "../lib/http-error.js";
import { SESSION_COOKIE, findSession } from "../lib/session.js";

// F-02 access-control foundation (system SDS sections 1 and 5).
// Order: originCheck -> requireAuth -> requireRole -> route (params, owner-scoped load, rules).

export const clientOrigin = () => process.env.CLIENT_ORIGIN || "http://localhost:5173";
const WRITES = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// The app's own origin. Behind Cloud Run the Host header is the public host name.
function ownOrigin(req: Request): string | null {
  const host = (req.headers["x-forwarded-host"] as string | undefined) ?? req.headers.host;
  if (!host) return null;
  const proto = ((req.headers["x-forwarded-proto"] as string | undefined) ?? req.protocol).split(",")[0].trim();
  return `${proto}://${host}`;
}

// CSRF cover beside SameSite=Strict (AC-12): a write whose Origin is neither the
// app's own origin nor CLIENT_ORIGIN (local Vite dev server) is refused.
export const originCheck: RequestHandler = (req, res, next) => {
  const origin = req.headers.origin;
  if (WRITES.has(req.method) && origin !== undefined && origin !== clientOrigin() && origin !== ownOrigin(req)) {
    sendError(res, 403, "ORIGIN_NOT_ALLOWED", "This request did not come from the MoneyLog app.");
    return;
  }
  next();
};

function readCookie(req: Request, name: string): string | undefined {
  for (const pair of (req.headers.cookie ?? "").split(";")) {
    const i = pair.indexOf("=");
    if (i > 0 && pair.slice(0, i).trim() === name) return pair.slice(i + 1).trim();
  }
  return undefined;
}

export interface Auth { user: User; sessionId: number }
// The ONLY way a route learns who is calling - never from the body or query.
export const authOf = (res: Response) => res.locals.auth as Auth;

const authRequired = (res: Response) => sendError(res, 401, "AUTH_REQUIRED", "Your session has ended. Please sign in again.");

export const requireAuth: RequestHandler = (req, res, next) => {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return authRequired(res);
  findSession(getPrisma(), token).then((found) => {
    if (!found) return authRequired(res);
    res.locals.auth = found satisfies Auth;
    next();
  }, next);
};

// Runs before any parameter is parsed or row loaded, so a 403 reveals nothing.
export const requireRole = (...roles: Role[]): RequestHandler => (_req, res, next) => {
  if (!roles.includes(authOf(res).user.role)) {
    sendError(res, 403, "FORBIDDEN_ROLE", "You do not have access to this.");
    return;
  }
  next();
};

export const userOnly: RequestHandler[] = [requireAuth, requireRole("USER")];
export const adminOnly: RequestHandler[] = [requireAuth, requireRole("ADMIN")];
