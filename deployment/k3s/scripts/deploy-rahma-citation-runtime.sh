#!/bin/bash
# deploy-rahma-citation-runtime.sh — operator helper for K3s.
set -e

NAMESPACE="rahma"
MANIFEST="deployment/k3s/wasm/rahma-citation-runtime.yaml"

echo "Checking namespace $NAMESPACE..."
kubectl get namespace $NAMESPACE >/dev/null 2>&1 || kubectl create namespace $NAMESPACE

echo "Applying manifest $MANIFEST..."
kubectl apply -f $MANIFEST

echo "Waiting for rollout..."
kubectl rollout status deployment/rahma-citation-wasm -n $NAMESPACE --timeout=60s

echo "Verifying liveness..."
kubectl get pods -l app=rahma-citation-wasm -n $NAMESPACE
