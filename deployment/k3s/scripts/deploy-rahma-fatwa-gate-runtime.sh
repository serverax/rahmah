#!/bin/bash
# deploy-rahma-fatwa-gate-runtime.sh — operator helper for K3s.
set -e

NAMESPACE="rahma"
MANIFEST="deployment/k3s/wasm/rahma-fatwa-gate-runtime.yaml"

echo "Checking namespace $NAMESPACE..."
kubectl get namespace $NAMESPACE >/dev/null 2>&1 || kubectl create namespace $NAMESPACE

echo "Applying manifest $MANIFEST..."
kubectl apply -f $MANIFEST

echo "Waiting for rollout..."
kubectl rollout status deployment/rahma-fatwa-gate-wasm -n $NAMESPACE --timeout=60s

echo "Verifying liveness..."
kubectl get pods -l app=rahma-fatwa-gate-wasm -n $NAMESPACE
