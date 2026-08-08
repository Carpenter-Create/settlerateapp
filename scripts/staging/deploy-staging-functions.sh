#!/usr/bin/env bash
# Deploy Edge Functions to the SettleRate staging Supabase project.
# Authority: docs/adr/0008-environment-topology.md, docs/staging/STAGING_EDGE.md
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

echo "[staging] deploying Edge Functions to ${STAGING_REF} (never ${PRODUCTION_REF})..."
echo "[staging] using --use-api so monorepo packages/core imports are uploaded (CLI Docker mount is insufficient)."
for name in "${FUNCTIONS[@]}"; do
  echo "[staging] deploy ${name}..."
  supabase functions deploy "${name}" --project-ref "${STAGING_REF}" --use-api
done

echo "[staging] listing functions on staging..."
supabase functions list --project-ref "${STAGING_REF}"

echo "[staging] done. Stripe test secrets are Epic 7 PR 4 — deploy alone does not resume Phase 7B."
