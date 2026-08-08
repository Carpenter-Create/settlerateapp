#!/usr/bin/env bash
# Non-secret isolation probes for SettleRate staging (Epic 7).
# Requires: supabase CLI authenticated; does not print secrets.
set -euo pipefail

STAGING_REF="gkhbalfpxjtleypbabjo"
PRODUCTION_REF="vpcxzbaxhpucvevnkalo"

echo "[isolation] listing staging Edge Functions (expect 7 ACTIVE)..."
supabase functions list --project-ref "${STAGING_REF}"

echo "[isolation] confirming CLI is not forced onto staging after list..."
# listing does not change link; report current link if present
if [[ -f supabase/.temp/project-ref ]]; then
  linked="$(cat supabase/.temp/project-ref)"
  echo "[isolation] current CLI link: ${linked}"
  if [[ "${linked}" == "${STAGING_REF}" ]]; then
    echo "[isolation] WARNING: CLI linked to staging — restore with:"
    echo "  supabase link --project-ref ${PRODUCTION_REF} --yes"
  fi
fi

echo "[isolation] expected staging API host: https://${STAGING_REF}.supabase.co"
echo "[isolation] expected production API host: https://${PRODUCTION_REF}.supabase.co"
echo "[isolation] done (SQL row counts / tip should be verified via Dashboard or MCP)."
