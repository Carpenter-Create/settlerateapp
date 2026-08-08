#!/usr/bin/env bash
# Apply pending git migrations to staging only (ADR 0014).
# Fail closed on wrong project ref or ledger divergence.
# CI: ephemeral link to staging — does NOT restore production link.
# Local: restores production link on EXIT when RESTORE_PRODUCTION_LINK=1 (default outside CI).
set -euo pipefail

STAGING_REF="gkhbalfpxjtleypbabjo"
PRODUCTION_REF="vpcxzbaxhpucvevnkalo"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PREFLIGHT="$ROOT/scripts/staging/preflight-pgcrypto-wrappers.sql"
REPORT="${STAGING_MIGRATION_REPORT:-$ROOT/staging-migration-ledger.json}"

json_field() {
  local file="$1"
  local expr="$2"
  node --input-type=module -e "import { readFileSync } from 'node:fs'; const r=JSON.parse(readFileSync(process.argv[1],'utf8')); const v=(${expr}); process.stdout.write(v==null?'':String(v));" "$file"
}

cd "$ROOT"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "[staging-migrate] REFUSE: SUPABASE_ACCESS_TOKEN missing" >&2
  exit 1
fi

echo "[staging-migrate] inspecting ledger for ${STAGING_REF}..."
node scripts/deploy/inspectMigrationLedger.mjs --role staging --project-ref "${STAGING_REF}" --out "${REPORT}"

status="$(json_field "${REPORT}" "r.comparison.status")"
if [[ "${status}" == "diverged" ]]; then
  echo "[staging-migrate] REFUSE: ledger diverged" >&2
  exit 1
fi

pending_count="$(json_field "${REPORT}" "r.comparison.pending.length")"
echo "[staging-migrate] status=${status} pending=${pending_count}"

if [[ "${pending_count}" == "0" ]]; then
  echo "[staging-migrate] nothing to apply"
  exit 0
fi

RESTORE_PRODUCTION_LINK="${RESTORE_PRODUCTION_LINK:-}"
if [[ -z "${RESTORE_PRODUCTION_LINK}" ]]; then
  if [[ "${CI:-}" == "true" || -n "${GITHUB_ACTIONS:-}" ]]; then
    RESTORE_PRODUCTION_LINK=0
  else
    RESTORE_PRODUCTION_LINK=1
  fi
fi

cleanup() {
  if [[ "${RESTORE_PRODUCTION_LINK}" == "1" ]]; then
    echo "[staging-migrate] restoring CLI link to production ${PRODUCTION_REF}..."
    supabase link --project-ref "${PRODUCTION_REF}" --yes || true
  fi
}
trap cleanup EXIT

echo "[staging-migrate] linking ${STAGING_REF} (never ${PRODUCTION_REF})..."
supabase link --project-ref "${STAGING_REF}" --yes
linked="$(cat supabase/.temp/project-ref 2>/dev/null || true)"
if [[ "${linked}" != "${STAGING_REF}" ]]; then
  echo "[staging-migrate] REFUSE: linked='${linked}' expected='${STAGING_REF}'" >&2
  exit 1
fi

echo "[staging-migrate] pgcrypto preflight..."
supabase db query --linked --file "$PREFLIGHT"

linked="$(cat supabase/.temp/project-ref 2>/dev/null || true)"
if [[ "${linked}" != "${STAGING_REF}" ]]; then
  echo "[staging-migrate] REFUSE: linked changed before push: '${linked}'" >&2
  exit 1
fi

echo "[staging-migrate] pushing pending migrations to staging..."
supabase db push --linked --yes

echo "[staging-migrate] re-inspecting ledger..."
node scripts/deploy/inspectMigrationLedger.mjs --role staging --project-ref "${STAGING_REF}" --out "${REPORT}"
after="$(json_field "${REPORT}" "r.comparison.status")"
if [[ "${after}" != "aligned" ]]; then
  echo "[staging-migrate] REFUSE: expected aligned after push, got ${after}" >&2
  exit 1
fi

echo "[staging-migrate] done tip=$(json_field "${REPORT}" "r.comparison.targetTip")"
