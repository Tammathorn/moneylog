import { Router } from "express";
import type { User } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { handle, parseId, sendError, sendNotFound, sendValidation } from "../lib/http-error.js";
import { adminOnly, authOf } from "../middleware/auth.js";

export const adminRouter = Router();
adminRouter.use(adminOnly);

// D-07, BR-20: identity fields only - never financial data or counts.
const adminUserDto = (u: User) => ({ id: u.id, email: u.email, displayName: u.displayName, role: u.role, isActive: u.isActive, createdAt: u.createdAt.toISOString() });

adminRouter.get("/users", handle(async (_req, res) => {
  const users = await getPrisma().user.findMany({ orderBy: { email: "asc" } });
  res.json({ users: users.map(adminUserDto) });
}));

// F-08 - AC-39..AC-41, BR-22, BR-23.
adminRouter.patch("/users/:id", handle(async (req, res) => {
  const id = parseId(req.params.id);
  const prisma = getPrisma();
  const target = id === null ? null : await prisma.user.findUnique({ where: { id } });
  if (!target) return sendNotFound(res);
  const { isActive } = req.body ?? {};
  if (typeof isActive !== "boolean") return sendValidation(res, { isActive: "Choose enabled (true) or disabled (false)." });
  if (!isActive && target.id === authOf(res).user.id) {
    return sendError(res, 422, "SELF_DISABLE_FORBIDDEN", "You cannot disable your own account.");
  }
  const [updated] = await prisma.$transaction([
    prisma.user.update({ where: { id: target.id }, data: { isActive } }),
    ...(isActive ? [] : [prisma.session.deleteMany({ where: { userId: target.id } })]),
  ]);
  res.json({ user: adminUserDto(updated as User) });
}));
