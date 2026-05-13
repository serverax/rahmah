# syntax=docker/dockerfile:1.7
# -----------------------------------------------------------------------------
# Sakina backend Dockerfile
# Multi-stage: deps -> runtime. Non-root user. No build step needed (pure ESM).
# -----------------------------------------------------------------------------

# ---- deps ---------------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# Reproducible install. --omit=dev keeps runtime image lean.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# ---- runtime ------------------------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

# Non-root user. UID/GID 10001 matches the K8s Deployment securityContext.
RUN addgroup -g 10001 sakina \
 && adduser  -u 10001 -G sakina -S -H -D sakina

COPY --from=deps --chown=sakina:sakina /app/node_modules ./node_modules
COPY --chown=sakina:sakina package.json ./
COPY --chown=sakina:sakina src ./src

USER sakina
EXPOSE 3000

# Container-level health check uses the same endpoint as the K8s probe.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1 || exit 1

CMD ["node", "src/index.js"]
