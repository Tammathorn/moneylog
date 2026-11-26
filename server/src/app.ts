import express from "express";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { errorHandler, sendError } from "./lib/http-error.js";
import { originCheck } from "./middleware/auth.js";
import { getPrisma } from "./prisma.js";
import { authRouter } from "./routes/auth.js";
import { accountsRouter } from "./routes/accounts.js";
import { transactionsRouter } from "./routes/transactions.js";
import { summaryRouter } from "./routes/summary.js";
import { loansRouter } from "./routes/loans.js";
import { adminRouter } from "./routes/admin.js";

// Exported without listen() so Supertest can import it (index.ts starts the server).
export const app = express();
app.disable("x-powered-by");
app.use(originCheck);
app.use(express.json({ limit: "100kb" }));
// An unparseable JSON body is treated as an empty body; route validation reports it.
app.use((err: { type?: string }, req: express.Request, _res: express.Response, next: express.NextFunction) => {
  if (err?.type === "entity.parse.failed") {
    req.body = {};
    return next();
  }
  next(err);
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "MoneyLog API" });
});
// Readiness: proves the API can reach PostgreSQL (smoke test, Lab 5).
app.get("/api/ready", async (_req, res) => {
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected" });
  } catch {
    res.status(503).json({ status: "unavailable", db: "disconnected" });
  }
});
// Which commit is running (R-08). Set at image build / deploy time.
app.get("/api/version", (_req, res) => {
  res.json({ service: "moneylog", commit: process.env.APP_COMMIT_SHA || "unknown" });
});
app.use("/api/auth", authRouter);
app.use("/api/accounts", accountsRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/summary", summaryRouter);
app.use("/api/loans", loansRouter);
app.use("/api/admin", adminRouter);

app.use("/api", (_req, res) => sendError(res, 404, "NOT_FOUND", "That record was not found."));

// Production (Docker / Cloud Run): one process also serves the built client.
const clientDist = resolve(dirname(fileURLToPath(import.meta.url)), "../../client/dist");
if (process.env.SERVE_CLIENT === "true" && existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => res.sendFile(resolve(clientDist, "index.html")));
}

app.use(errorHandler);
