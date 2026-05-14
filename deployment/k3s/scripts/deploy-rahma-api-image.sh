#!/usr/bin/env bash
# =============================================================================
# deploy-rahma-api-image.sh
#
# Swap the rahma-api Deployment from placeholder to a real image and wait for
# rollout. Operator-run on a verified Sakina-safe context. NEVER touches
# ingress, web/admin, firewall, K3s service, Traefik, cert-manager, or
# NetworkPolicy.
#
# Usage:
#   deploy-rahma-api-image.sh [image-ref] [--dry-run]
#
#   image-ref  Default: ghcr.io/serverax/rahmah/rahma-api:latest
#   --dry-run  Static checks only — no kubectl mutations. Safe to run anywhere.
#
# Exit codes:
#   0  rollout succeeded (or --dry-run completed)
#   1  precondition failed
#   2  rollout itself failed
#   3  post-check failed (e.g. ingress appeared)
# =============================================================================
set -u

red()    { printf "\033[31m%s\033[0m\n" "$*"; }
green()  { printf "\033[32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }
ok()     { printf "[deploy] OK: %s\n" "$*"; }
fail()   { printf "[deploy] FAIL: %s\n" "$*" >&2; }

DEFAULT_IMAGE='ghcr.io/serverax/rahmah/rahma-api:latest'
DRY_RUN=0
IMAGE="$DEFAULT_IMAGE"
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    -h|--help)
      echo "Usage: $0 [image-ref] [--dry-run]"
      echo "Default image: $DEFAULT_IMAGE"
      exit 0
      ;;
    -*)        red "Unknown flag: $arg"; exit 1 ;;
    *)         IMAGE="$arg" ;;
  esac
done
yellow "Target image: $IMAGE"
if [[ $DRY_RUN -eq 1 ]]; then yellow "Mode: DRY-RUN (no kubectl mutation)"; fi

cd "$(dirname "$0")/../../.." || exit 1

# --- 1. Static checks (always run, even in dry-run) -------------------------
# Image-ref shape: ghcr.io/serverax/rahmah/rahma-api[:tag]
if [[ ! "$IMAGE" =~ ^ghcr\.io/serverax/rahmah/rahma-api(:[A-Za-z0-9._-]+)?$ ]]; then
  red "Image ref does not match expected ghcr.io/serverax/rahmah/rahma-api[:tag]"
  exit 1
fi
ok "image ref matches expected pattern"

# Deployment manifest exists in the repo.
if [[ ! -f deployment/k3s/api/rahma-api.yaml ]]; then
  red "deployment/k3s/api/rahma-api.yaml missing in repo"
  exit 1
fi
ok "rahma-api.yaml present in repo"

# Repo MUST NOT contain a public ingress manifest under deployment/k3s/ingress/.
if compgen -G "deployment/k3s/ingress/*.yaml" >/dev/null 2>&1; then
  red "deployment/k3s/ingress/*.yaml present — Rahma is mobile-only; no public ingress."
  exit 1
fi
ok "no public Rahma ingress in repo"

# --- 2. Dry-run exit path ---------------------------------------------------
if [[ $DRY_RUN -eq 1 ]]; then
  ok "DRY-RUN complete — no kubectl mutation performed"
  green "==== dry-run validated for image: $IMAGE ===="
  exit 0
fi

# --- 3. Cluster-side gate ---------------------------------------------------
if ! command -v kubectl >/dev/null 2>&1; then red "kubectl not found"; exit 1; fi
CTX=$(kubectl config current-context 2>/dev/null || true)
if [[ -z "$CTX" ]]; then red "no current kubectl context"; exit 1; fi
FORBIDDEN_RE='(aks-iterlaw|prod-iterlaw|iterlaw|rightsnow|ordinoxai|alaa-beauty|aks-prod|production-iterlaw)'
if [[ "$CTX" =~ $FORBIDDEN_RE ]]; then red "FORBIDDEN CONTEXT: $CTX"; exit 1; fi
green "Context OK: $CTX"

# Refuse if the rahma-api Deployment doesn't exist yet — operator must apply
# deployment/k3s/api/rahma-api.yaml first.
if ! kubectl -n rahma-api get deploy rahma-api >/dev/null 2>&1; then
  red "Deployment rahma-api/rahma-api missing. Apply deployment/k3s/api/rahma-api.yaml first."
  exit 1
fi

# Refuse if any ingress for Rahma exists (we should stay internal-only here).
ING=$(kubectl get ingress -A 2>/dev/null | grep -E 'rahma-(api|web|admin)' || true)
if [[ -n "$ING" ]]; then
  red "A Rahma ingress already exists — this script only rolls the internal Deployment."
  red "Operator: verify the ingress is intentional and run the rollout manually."
  echo "$ING" >&2
  exit 1
fi

CURRENT_IMAGE=$(kubectl -n rahma-api get deploy rahma-api -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || true)
yellow "Current image: ${CURRENT_IMAGE:-unknown}"

# --- 4. Apply rollout -------------------------------------------------------
yellow "Setting image: rahma-api/rahma-api → $IMAGE"
kubectl -n rahma-api set image deployment/rahma-api rahma-api="$IMAGE" --record=false

yellow "Waiting for rollout..."
if ! kubectl -n rahma-api rollout status deployment/rahma-api --timeout=180s; then
  red "Rollout FAILED. Pods:"
  kubectl -n rahma-api get pods -o wide >&2 || true
  kubectl -n rahma-api describe deploy rahma-api | tail -40 >&2 || true
  exit 2
fi
green "Rollout succeeded."

# --- 5. Internal probes (no public exposure, no secret print) --------------
yellow "Running internal /health + /ready probes..."
PROBE_OUT=$(kubectl -n rahma-api run rahma-probe \
    --rm -i --restart=Never \
    --image=alpine/curl:8.10.1 \
    -- sh -c "
        echo '--- /health ---';
        curl -sS -m 5 -w '\nhttp_status=%{http_code}\n' http://rahma-api.rahma-api.svc.cluster.local/health || true;
        echo '';
        echo '--- /ready (first 800 bytes) ---';
        curl -sS -m 5 http://rahma-api.rahma-api.svc.cluster.local/ready | head -c 800 || true;
        echo '';
    " 2>/dev/null || true)
echo "$PROBE_OUT"

# --- 6. Post-check: no Rahma ingress appeared ------------------------------
if kubectl get ingress -n rahma-api 2>/dev/null | grep -q rahma; then
  red "POST-CHECK FAILED: a Rahma ingress appeared in rahma-api after rollout."
  red "Rahma must remain mobile-only. Investigate immediately."
  exit 3
fi
ok "no Rahma ingress after rollout"

# --- 7. Capture local report (no secret printed) ----------------------------
FINAL_IMAGE=$(kubectl -n rahma-api get deploy rahma-api -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || echo unknown)
TS=$(date -u +%Y-%m-%dT%H-%M-%SZ)
REPORT="reports/RAHMA_API_ROLLOUT_${TS}.md"
mkdir -p reports
{
  echo "# Rahma API rollout — ${TS}"
  echo ""
  echo "- Context: \`${CTX}\`"
  echo "- Previous image: \`${CURRENT_IMAGE:-unknown}\`"
  echo "- New image:      \`${FINAL_IMAGE}\`"
  echo ""
  echo "## Internal probe output"
  echo ""
  echo '```'
  echo "${PROBE_OUT}"
  echo '```'
  echo ""
  echo "## No Rahma ingress"
  echo ""
  echo '```'
  kubectl get ingress -A 2>/dev/null | grep rahma || echo "(none)"
  echo '```'
} > "$REPORT"
green "Local rollout report: $REPORT"

green "==== rahma-api image rolled to: $IMAGE ===="
green "Final image: $FINAL_IMAGE"
