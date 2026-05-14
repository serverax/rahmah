# syntax=docker/dockerfile:1.7
# -----------------------------------------------------------------------------
# Rahma fatwa-policy-gate WASM service — runtime image (PLACEHOLDER).
#
# This Dockerfile is intentionally a placeholder. The real image will load
# fatwa_policy_gate.wasm (built by rahma-wasm-build) into a wasmtime-based
# Rust HTTP wrapper that exposes:
#
#   GET  /health
#   POST /evaluate     (JSON in, JSON out — matches the WASM contract)
#
# Until the wrapper ships, this Dockerfile is NOT used. The K3s placeholder
# Deployment runs `nginxinc/nginx-unprivileged:1.27-alpine` instead.
# -----------------------------------------------------------------------------
FROM alpine:3.20 AS placeholder
RUN echo "Rahma fatwa-policy-gate WASM runtime — placeholder Dockerfile" > /readme.txt
CMD ["cat", "/readme.txt"]
