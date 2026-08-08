#!/usr/bin/env bash
# Deploy Edge Functions to staging only (fixed project ref).
# Reuses Epic 7 --use-api monorepo method. Never targets production.
set -euo pipefail

STAGING_REF="gkhbalfpxjtleypbabjo"
PRODUCTION_REF="vpcxzbaxhpucvevnkalo"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

FUNCTIONS=(
  check-subscription
  create-checkout
  customer-portal
  admin-assign-advisor
  stripe-webhook
  generate-pdf
  export-share
)

cd "$ROOT"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "[staging-edge] REFUSE: SUPABASE_ACCESS_TOKEN missing" >&2
  exit 1
fi

# Adversarial guard: refuse if caller tried to override via env.
if [[ "${SUPABASE_PROJECT_REF:-}" == "${PRODUCTION_REF}" ]]; then
  echo "[staging-edge] REFUSE: SUPABASE_PROJECT_REF is production" >&2
  exit 1
fi
if [[ -n "${SUPABASE_PROJECT_REF:-}" && "${SUPABASE_PROJECT_REF}" != "${STAGING_REF}" ]]; then
  echo "[staging-edge] REFUSE: unexpected SUPABASE_PROJECT_REF=${SUPABASE_PROJECT_REF}" >&2
  exit 1
fi

echo "[staging-edge] deploying to ${STAGING_REF} (forbidden: ${PRODUCTION_REF})"
echo "[staging-edge] using --use-api for packages/core monorepo upload"
for name in "${FUNCTIONS[@]}"; do
  echo "[staging-edge] deploy ${name}..."
  supabase functions deploy "${name}" --project-ref "${STAGING_REF}" --use-api
done

echo "[staging-edge] listing staging functions..."
supabase functions list --project-ref "${STAGING_REF}"
echo "[staging-edge] done"
