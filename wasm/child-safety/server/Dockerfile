# syntax=docker/dockerfile:1.7
# -----------------------------------------------------------------------------
# Rahma child-safety runtime bridge image.
#
# Today: Node + Fastify HTTP wrapper running the deterministic JS port.
# Future: swap to a wasmtime/wasmedge loader of child_safety.wasm without
# changing the HTTP contract.
# -----------------------------------------------------------------------------

FROM node:20-alpine AS deps
WORKDIR /app
COPY wasm/child-safety/server/package.json wasm/child-safety/server/package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev || npm install --omit=dev

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0

RUN addgroup -g 10005 wasm \
 && adduser  -u 10005 -G wasm -S -H -D wasm

COPY --from=deps --chown=wasm:wasm /app/node_modules ./node_modules
COPY --chown=wasm:wasm wasm/child-safety/server/package.json ./
COPY --chown=wasm:wasm wasm/child-safety/server/src         ./src

USER wasm
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1 || exit 1

CMD ["node", "src/index.js"]
