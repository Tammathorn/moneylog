import type { User } from "@prisma/client";

// Never spread a User row into a response: these are the only fields that leave the server.
export const userIdentity = (u: User) => ({ id: u.id, email: u.email, displayName: u.displayName, role: u.role });
