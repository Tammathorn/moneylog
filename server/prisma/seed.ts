import { PrismaClient } from "@prisma/client";
import { seed } from "../src/seed/seed-data.js";

const password = process.env.SEED_DEMO_PASSWORD;
if (!password || password.length < 8) {
  console.error("Set SEED_DEMO_PASSWORD (8+ characters) in server/.env before seeding.");
  process.exit(1);
}
const prisma = new PrismaClient();
seed(prisma, password)
  .then(() => console.log("Seed complete: 4 users, 10 accounts per USER."))
  .finally(() => prisma.$disconnect());
