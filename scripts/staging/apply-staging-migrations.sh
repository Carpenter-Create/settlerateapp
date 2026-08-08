#!/usr/bin/env bash
# Apply git migrations to the SettleRate staging Supabase project.
# Authority: docs/adr/0008-environment-topology.md, docs/staging/STAGING_DATABASE.md
#
# Requirements:
# - supabase CLI authenticated
# - staging project ref gkhbalfpxjtleypbabjo
# - production CLI link restored at the end (HARD isolation hygiene)
set -euo pipefail

STAGING_REF="gkhbalfpxjtleypbabjo"
PRODUCTION_REF="vpcxzbaxhpucvevnkalo"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PREFLIGHT="$ROOT/scripts/staging/preflight-pgcrypto-wrappers.sql"

cleanup() {
  echo "[staging] restoring CLI link to production ${PRODUCTION_REF}..."
  supabase link --project-ref "${PRODUCTION_REF}" --yes
}
trap cleanup EXIT

cd "$ROOT"

echo "[staging] linking ${STAGING_REF}..."
supabase link --project-ref "${STAGING_REF}" --yes

echo "[staging] applying pgcrypto preflight (idempotent)..."
supabase db query --linked --file "$PREFLIGHT"

echo "[staging] pushing pending git migrations..."
supabase db push --linked --yes

echo "[staging] done. Tip should be 20260808040000 (or later git tip)."
