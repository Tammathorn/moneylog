# MoneyLog - one production image: Express API + built React SPA on port 3000.
# Build from the repo root:  docker build --build-arg GIT_SHA=$(git rev-parse HEAD) -t moneylog .
# Secrets are never baked in; DATABASE_URL and passwords are injected at run time.

# --- Stage 1: client (Vite build) ---------------------------------------------
FROM node:24-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# --- Stage 2: server (TypeScript + Prisma client) ------------------------------
# Prisma needs the openssl binary to pick its engine (linux-musl-openssl-3.0.x).
FROM node:24-alpine AS server-builder
WORKDIR /app/server
RUN apk add --no-cache openssl
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npx prisma generate && npx tsc && npm prune --omit=dev

# --- Stage 3: runtime ----------------------------------------------------------
FROM node:24-alpine AS production
WORKDIR /app/server
RUN apk add --no-cache openssl
# Production dependencies only; the Prisma CLI is a runtime dependency for the
# migration job (prisma migrate deploy) that runs from this same image.
COPY --from=server-builder /app/server/package*.json ./
COPY --from=server-builder /app/server/node_modules ./node_modules
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/prisma ./prisma
COPY --from=client-builder /app/client/dist /app/client/dist

ARG GIT_SHA=unknown
ENV NODE_ENV=production \
    TZ=Asia/Bangkok \
    PORT=3000 \
    SERVE_CLIENT=true \
    APP_COMMIT_SHA=${GIT_SHA}
EXPOSE 3000
USER node
CMD ["node", "dist/index.js"]
