import { PrismaClient } from "@prisma/client";
import { readSeedConfig, seed } from "./seed-data.js";

// Entry point for `npm run db:seed` (dev, via tsx) and `npm run db:seed:prod`
// (compiled, used by the Cloud Run migration job). Prints no secret.
let options;
try {
  options = readSeedConfig(process.env);
} catch (e) {
  console.error(`Seed not run: ${(e as Error).message}`);
  process.exit(1);
}
const prisma = new PrismaClient();
seed(prisma, options)
  .then(() => console.log(`Seed complete: administrator${options.demoPassword ? " + demo users and accounts" : " only (SEED_DEMO_DATA=false)"}.`))
  .catch((e) => {
    console.error("Seed failed:", (e as Error).message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
