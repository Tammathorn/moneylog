import { Router } from "express";
import { getPrisma } from "../prisma.js";
import { handle, sendError, sendValidation } from "../lib/http-error.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { checkNewPassword } from "../domain/password-policy.js";
import { clearedSessionCookie, createSession, sessionCookie } from "../lib/session.js";
import { authOf, requireAuth } from "../middleware/auth.js";
import { userIdentity } from "../lib/dto.js";

export const authRouter = Router();

// F-01 - AC-01..AC-03, BR-23, BR-24.
authRouter.post("/login", handle(async (req, res) => {
  const { email, password } = req.body ?? {};
  const fields: Record<string, string> = {};
  if (typeof email !== "string" || !email.trim()) fields.email = "Enter your e-mail.";
  if (typeof password !== "string" || !password) fields.password = "Enter your password.";
  if (Object.keys(fields).length) return sendValidation(res, fields);

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  // verifyPassword always runs, so every failure costs the same time.
  const ok = verifyPassword(user?.passwordHash ?? null, password);
  if (!user || !ok || !user.isActive) {
    return sendError(res, 401, "INVALID_CREDENTIALS", "E-mail or password is incorrect.");
  }
  const token = await createSession(prisma, user.id);
  res.setHeader("Set-Cookie", sessionCookie(token));
  res.status(200).json({ user: userIdentity(user) });
}));

authRouter.post("/logout", requireAuth, handle(async (_req, res) => {
  await getPrisma().session.deleteMany({ where: { id: authOf(res).sessionId } });
  res.setHeader("Set-Cookie", clearedSessionCookie());
  res.status(204).end();
}));

authRouter.get("/me", requireAuth, (_req, res) => {
  res.json({ user: userIdentity(authOf(res).user) });
});

// F-16 FR-22 - AC-76..AC-79: own password only (no user id in the request); other sessions are ended.
authRouter.put("/password", requireAuth, handle(async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  const checked = checkNewPassword(currentPassword, newPassword);
  if (!checked.ok) return sendValidation(res, checked.fields);
  const { user, sessionId } = authOf(res);
  const prisma = getPrisma();
  const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!verifyPassword(fresh.passwordHash, currentPassword)) {
    return sendValidation(res, { currentPassword: "The current password is not correct." });
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(checked.value) } }),
    prisma.session.deleteMany({ where: { userId: user.id, id: { not: sessionId } } }),
  ]);
  res.json({ ok: true });
}));
