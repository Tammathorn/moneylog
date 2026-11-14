import { PrismaClient } from "@prisma/client";

// Lazy singleton so importing the app (e.g. in Supertest) opens no connection
// until a route actually needs the database.
let client: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!client) client = new PrismaClient();
  return client;
}
