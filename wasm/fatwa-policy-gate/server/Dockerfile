# syntax=docker/dockerfile:1.7
# -----------------------------------------------------------------------------
# Rahma fatwa-policy-gate runtime bridge image.
# -----------------------------------------------------------------------------

FROM node:20-alpine3.20 AS base
WORKDIR /app
RUN addgroup -S wasm && adduser -S wasm -G wasm
ENV PORT=8080
ENV NODE_ENV=production

FROM base AS deps
COPY wasm/fatwa-policy-gate/server/package.json wasm/fatwa-policy-gate/server/package-lock.json ./
RUN npm ci --only=production

FROM base AS release
COPY --from=deps /app/node_modules ./node_modules
COPY wasm/fatwa-policy-gate/server/src         ./src

USER wasm
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1 || exit 1

CMD ["node", "src/index.js"]
