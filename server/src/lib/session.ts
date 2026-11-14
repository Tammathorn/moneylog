import { createHash, randomBytes } from "node:crypto";
import type { PrismaClient, User } from "@prisma/client";

// NFR-03, system SDS section 6. The raw token lives only in the cookie; the
// Session row stores its SHA-256. Absolute 8-hour lifetime, no renewal.
export const SESSION_COOKIE = "ml_session";
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const TOKEN = /^[0-9a-f]{64}$/;

function attributes(): string {
  return `HttpOnly; SameSite=Strict; Path=/${process.env.COOKIE_SECURE === "true" ? "; Secure" : ""}`;
}
export const sessionCookie = (token: string) => `${SESSION_COOKIE}=${token}; ${attributes()}`;
export const clearedSessionCookie = () => `${SESSION_COOKIE}=; Max-Age=0; ${attributes()}`;

export const generateSessionToken = () => randomBytes(32).toString("hex");
export const hashSessionToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const sessionExpiry = (createdAt: Date) => new Date(createdAt.getTime() + SESSION_TTL_MS);
export const isSessionExpired = (expiresAt: Date, now: Date) => now.getTime() >= expiresAt.getTime();

export async function createSession(prisma: PrismaClient, userId: number, now = new Date()): Promise<string> {
  const token = generateSessionToken();
  await prisma.session.create({ data: { tokenHash: hashSessionToken(token), userId, createdAt: now, expiresAt: sessionExpiry(now) } });
  return token;
}

// Null for a malformed, unknown or expired token, or a disabled user (BR-23).
// An expired row is deleted when found.
export async function findSession(prisma: PrismaClient, token: string, now = new Date()): Promise<{ sessionId: number; user: User } | null> {
  if (!TOKEN.test(token)) return null;
  const row = await prisma.session.findUnique({ where: { tokenHash: hashSessionToken(token) }, include: { user: true } });
  if (!row) return null;
  if (isSessionExpired(row.expiresAt, now)) {
    await prisma.session.deleteMany({ where: { id: row.id } });
    return null;
  }
  if (!row.user.isActive) return null;
  return { sessionId: row.id, user: row.user };
}
