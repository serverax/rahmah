# syntax=docker/dockerfile:1.7
# -----------------------------------------------------------------------------
# Rahma web frontend — static-file Node server.
# Multi-stage: only runtime + public assets. Non-root.
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0

RUN addgroup -g 10002 rahma \
 && adduser  -u 10002 -G rahma -S -H -D rahma

# Only ship server + public assets. No dev tooling.
COPY --chown=rahma:rahma package.json ./
COPY --chown=rahma:rahma server.js ./
COPY --chown=rahma:rahma public ./public

USER rahma
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/" >/dev/null 2>&1 || exit 1

CMD ["node", "server.js"]
