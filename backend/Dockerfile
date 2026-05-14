# syntax=docker/dockerfile:1.7
# -----------------------------------------------------------------------------
# Rahma API Dockerfile (mobile-only Rahma backend).
#
# Identical contents to backend/app/Dockerfile, but referenced from the
# repo root via the rahma-container-build workflow so the published image
# is tagged ghcr.io/serverax/rahmah/rahma-api:latest (alongside the
# legacy sakina-backend:main tag).
#
# Multi-stage: deps -> runtime. Non-root user. No build step (pure ESM).
# -----------------------------------------------------------------------------

# ---- deps ---------------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
COPY backend/app/package.json backend/app/package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# ---- runtime ------------------------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

RUN addgroup -g 10001 rahma \
 && adduser  -u 10001 -G rahma -S -H -D rahma

COPY --from=deps --chown=rahma:rahma /app/node_modules ./node_modules
COPY --chown=rahma:rahma backend/app/package.json ./
COPY --chown=rahma:rahma backend/app/src ./src

USER rahma
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1 || exit 1

CMD ["node", "src/index.js"]
